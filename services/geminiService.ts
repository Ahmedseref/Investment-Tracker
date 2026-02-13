
import { GoogleGenAI, Type } from "@google/genai";
import { Account, Transaction } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

export const getInvestmentInsights = async (accounts: Account[], transactions: Transaction[]) => {
  try {
    const context = JSON.stringify({
      accounts: accounts.map(a => ({ name: a.bankName, type: a.investmentType, balance: a.currentBalance, currency: a.currency })),
      recentTransactions: transactions.slice(-10).map(t => ({ date: t.date, profit: t.calculatedProfit, type: t.type }))
    });

    const prompt = `
      As a senior Islamic finance advisor, analyze this investment data:
      ${context}

      Provide:
      1. A summary of overall performance.
      2. Identify the strongest and weakest accounts.
      3. Suggest if the user should rebalance (e.g., move from TRY to USD or change investment types).
      4. Predict potential trends based on the profit-sharing history.
      5. A risk score from 1-10.
      
      Keep the response concise, professional, and formatted in Markdown.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        thinkingConfig: { thinkingBudget: 0 }
      }
    });

    return response.text;
  } catch (error) {
    console.error("Gemini Error:", error);
    return "Unable to generate insights at this moment. Please check your internet connection and API key.";
  }
};
