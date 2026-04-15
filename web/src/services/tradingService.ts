import { 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  query, 
  where, 
  orderBy, 
  limit, 
  onSnapshot, 
  runTransaction,
  updateDoc,
  serverTimestamp,
  Timestamp
} from 'firebase/firestore';
import { db, auth } from '../firebase';
import { 
  Account, 
  Position, 
  Order, 
  LedgerEvent, 
  AssetType, 
  OrderSide, 
  OrderSource 
} from '../types';

import { geminiService } from './geminiService';
import { MOCK_SYMBOLS } from '../constants';
import { Agent, AgentLog } from '../types';

export const tradingService = {
  // ... existing code ...

  async checkGuest(uid: string) {
    if (uid === 'guest-user') {
      throw new Error("Action not allowed in Demo Mode. Please sign in to save your data.");
    }
  },

  async getAccount(uid: string): Promise<Account | null> {
    if (uid === 'guest-user') {
      return {
        uid: 'guest-user',
        cashBalance: 25000,
        totalDeposits: 25000,
        totalWithdrawals: 0,
        updatedAt: new Date().toISOString()
      };
    }
    const docRef = doc(db, 'accounts', uid);
    const docSnap = await getDoc(docRef);
    return docSnap.exists() ? (docSnap.data() as Account) : null;
  },

  async tickAgent(agent: Agent, positions: Position[]) {
    if (agent.uid === 'guest-user') {
      console.log("Demo tick - no data saved");
      return;
    }
    if (agent.status !== 'running') return;
    // ...

    const agentId = agent.id;
    const uid = agent.uid;

    try {
      // Log tick start
      const tickLogRef = doc(collection(db, 'agentLogs'));
      await setDoc(tickLogRef, {
        id: tickLogRef.id,
        agentId,
        uid,
        timestamp: new Date().toISOString(),
        eventType: 'tick',
        summary: `Agent "${agent.name}" started tick.`
      });

      // Get decisions from Gemini
      const { decisions } = await geminiService.getAgentDecision(agent, MOCK_SYMBOLS, positions);

      for (const decision of decisions) {
        if (decision.action === 'HOLD') continue;

        const symbolInfo = MOCK_SYMBOLS.find(s => s.symbol === decision.symbol);
        if (!symbolInfo) continue;

        // Log decision
        const decisionLogRef = doc(collection(db, 'agentLogs'));
        await setDoc(decisionLogRef, {
          id: decisionLogRef.id,
          agentId,
          uid,
          timestamp: new Date().toISOString(),
          eventType: 'decision',
          symbol: decision.symbol,
          summary: `Decision: ${decision.action} ${decision.quantity} ${decision.symbol}`,
          details: { reasoning: decision.reasoning, action: decision.action, quantity: decision.quantity }
        });

        // Execute trade
        try {
          await this.placeOrder(
            uid,
            decision.symbol,
            decision.action.toLowerCase() as OrderSide,
            decision.quantity,
            symbolInfo.price,
            symbolInfo.type,
            'bot',
            agentId
          );

          // Log success
          const orderLogRef = doc(collection(db, 'agentLogs'));
          await setDoc(orderLogRef, {
            id: orderLogRef.id,
            agentId,
            uid,
            timestamp: new Date().toISOString(),
            eventType: 'order_submitted',
            symbol: decision.symbol,
            summary: `Order filled: ${decision.action} ${decision.quantity} ${decision.symbol}`
          });
        } catch (tradeErr: any) {
          // Log risk block or error
          const errorLogRef = doc(collection(db, 'agentLogs'));
          await setDoc(errorLogRef, {
            id: errorLogRef.id,
            agentId,
            uid,
            timestamp: new Date().toISOString(),
            eventType: 'risk_block',
            symbol: decision.symbol,
            summary: `Trade blocked: ${tradeErr.message}`,
            details: { error: tradeErr.message }
          });
        }
      }

      // Update last tick time
      await updateDoc(doc(db, 'agents', agentId), {
        lastTickAt: new Date().toISOString()
      });

    } catch (err: any) {
      console.error("Agent tick failed:", err);
      const errorLogRef = doc(collection(db, 'agentLogs'));
      await setDoc(errorLogRef, {
        id: errorLogRef.id,
        agentId,
        uid,
        timestamp: new Date().toISOString(),
        eventType: 'error',
        summary: `Tick failed: ${err.message}`,
        details: { error: err.message }
      });
    }
  },

  async createAccount(uid: string, initialCash: number = 10000) {
    const account: Account = {
      uid,
      cashBalance: initialCash,
      totalDeposits: initialCash,
      totalWithdrawals: 0,
      updatedAt: new Date().toISOString()
    };
    await setDoc(doc(db, 'accounts', uid), account);
    
    // Log initial deposit
    await this.logLedgerEvent(uid, 'deposit', initialCash, 'Initial paper trading funds');
  },

  async logLedgerEvent(uid: string, type: LedgerEvent['type'], amount: number, description: string, referenceId?: string) {
    const eventRef = doc(collection(db, 'ledger'));
    const event: LedgerEvent = {
      id: eventRef.id,
      uid,
      type,
      amount,
      description,
      timestamp: new Date().toISOString(),
      referenceId
    };
    await setDoc(eventRef, event);
  },

  async depositFunds(uid: string, amount: number) {
    await runTransaction(db, async (transaction) => {
      const accountRef = doc(db, 'accounts', uid);
      const accountSnap = await transaction.get(accountRef);
      if (!accountSnap.exists()) throw new Error("Account not found");
      
      const account = accountSnap.data() as Account;
      transaction.update(accountRef, {
        cashBalance: account.cashBalance + amount,
        totalDeposits: account.totalDeposits + amount,
        updatedAt: new Date().toISOString()
      });
    });
    await this.logLedgerEvent(uid, 'deposit', amount, 'Manual deposit');
  },

  async withdrawFunds(uid: string, amount: number) {
    await runTransaction(db, async (transaction) => {
      const accountRef = doc(db, 'accounts', uid);
      const accountSnap = await transaction.get(accountRef);
      if (!accountSnap.exists()) throw new Error("Account not found");
      
      const account = accountSnap.data() as Account;
      if (account.cashBalance < amount) throw new Error("Insufficient funds");
      
      transaction.update(accountRef, {
        cashBalance: account.cashBalance - amount,
        totalWithdrawals: account.totalWithdrawals + amount,
        updatedAt: new Date().toISOString()
      });
    });
    await this.logLedgerEvent(uid, 'withdrawal', -amount, 'Manual withdrawal');
  },

  async placeOrder(uid: string, symbol: string, side: OrderSide, quantity: number, price: number, assetType: AssetType, source: OrderSource = 'manual', agentId?: string) {
    const orderRef = doc(collection(db, 'orders'));
    const order: Order = {
      id: orderRef.id,
      uid,
      symbol,
      side,
      quantity,
      orderType: 'market',
      status: 'pending',
      source,
      agentId,
      createdAt: new Date().toISOString()
    };

    await runTransaction(db, async (transaction) => {
      const accountRef = doc(db, 'accounts', uid);
      const accountSnap = await transaction.get(accountRef);
      if (!accountSnap.exists()) throw new Error("Account not found");
      const account = accountSnap.data() as Account;

      const totalValue = quantity * price;

      if (side === 'buy') {
        if (account.cashBalance < totalValue) throw new Error("Insufficient buying power");
        
        // Update account
        transaction.update(accountRef, {
          cashBalance: account.cashBalance - totalValue,
          updatedAt: new Date().toISOString()
        });

        // Update position
        const posId = `${uid}_${symbol}`;
        const posRef = doc(db, 'positions', posId);
        const posSnap = await transaction.get(posRef);
        
        if (posSnap.exists()) {
          const pos = posSnap.data() as Position;
          const newQty = pos.quantity + quantity;
          const newAvgPrice = ((pos.quantity * pos.averageEntryPrice) + totalValue) / newQty;
          transaction.update(posRef, {
            quantity: newQty,
            averageEntryPrice: newAvgPrice,
            updatedAt: new Date().toISOString()
          });
        } else {
          const newPos: Position = {
            id: posId,
            uid,
            symbol,
            assetType,
            quantity,
            averageEntryPrice: price,
            updatedAt: new Date().toISOString()
          };
          transaction.set(posRef, newPos);
        }

        // Finalize order
        transaction.set(orderRef, {
          ...order,
          status: 'filled',
          filledAt: new Date().toISOString(),
          fillPrice: price
        });

        // Log ledger
        const eventRef = doc(collection(db, 'ledger'));
        transaction.set(eventRef, {
          id: eventRef.id,
          uid,
          type: 'trade_buy',
          amount: -totalValue,
          description: `Bought ${quantity} ${symbol} @ ${price}`,
          timestamp: new Date().toISOString(),
          referenceId: orderRef.id
        });

      } else {
        // Sell
        const posId = `${uid}_${symbol}`;
        const posRef = doc(db, 'positions', posId);
        const posSnap = await transaction.get(posRef);
        
        if (!posSnap.exists() || posSnap.data().quantity < quantity) {
          throw new Error("Insufficient holdings to sell");
        }

        const pos = posSnap.data() as Position;
        const newQty = pos.quantity - quantity;
        
        if (newQty === 0) {
          transaction.delete(posRef);
        } else {
          transaction.update(posRef, {
            quantity: newQty,
            updatedAt: new Date().toISOString()
          });
        }

        // Update account
        transaction.update(accountRef, {
          cashBalance: account.cashBalance + totalValue,
          updatedAt: new Date().toISOString()
        });

        // Finalize order
        transaction.set(orderRef, {
          ...order,
          status: 'filled',
          filledAt: new Date().toISOString(),
          fillPrice: price
        });

        // Log ledger
        const eventRef = doc(collection(db, 'ledger'));
        transaction.set(eventRef, {
          id: eventRef.id,
          uid,
          type: 'trade_sell',
          amount: totalValue,
          description: `Sold ${quantity} ${symbol} @ ${price}`,
          timestamp: new Date().toISOString(),
          referenceId: orderRef.id
        });
      }
    });
  }
};
