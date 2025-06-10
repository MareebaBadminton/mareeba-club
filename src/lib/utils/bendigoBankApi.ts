// Bendigo Bank CDR API integration
'use client'

interface CDRTransaction {
  accountId: string;
  transactionId: string;
  isDetailAvailable: boolean;
  type: 'FEE' | 'INTEREST_CHARGED' | 'INTEREST_PAID' | 'TRANSFER_OUTGOING' | 'TRANSFER_INCOMING' | 'PAYMENT' | 'DIRECT_DEBIT' | 'OTHER';
  status: 'PENDING' | 'POSTED';
  description: string;
  postingDateTime?: string;
  valueDateTime?: string;
  executionDateTime?: string;
  amount: string;
  currency: string;
  reference: string;
  merchantName?: string;
  merchantCategoryCode?: string;
  billerCode?: string;
  billerName?: string;
  crn?: string;
}

interface CDRAccount {
  accountId: string;
  creationDate?: string;
  displayName: string;
  nickname?: string;
  openStatus: 'CLOSED' | 'OPEN';
  isOwned: boolean;
  accountOwnership: 'UNKNOWN' | 'ONE_PARTY' | 'TWO_PARTY' | 'MANY_PARTY' | 'OTHER';
  maskedNumber: string;
  productCategory: 'BUSINESS_LOANS' | 'CRED_AND_CHRG_CARDS' | 'LEASES' | 'MARGIN_LOANS' | 'OVERDRAFTS' | 'PERS_LOANS' | 'REGULATED_TRUST_ACCOUNTS' | 'RESIDENTIAL_MORTGAGES' | 'TERM_DEPOSITS' | 'TRADE_FINANCE' | 'TRANS_AND_SAVINGS_ACCOUNTS' | 'TRAVEL_CARDS';
  productName: string;
}

interface BendigoBankConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  accountId: string;
  baseUrl: string;
}

class BendigoBankCDRService {
  private config: BendigoBankConfig;
  private accessToken: string | null = null;
  private refreshToken: string | null = null;

  constructor(config: BendigoBankConfig) {
    this.config = {
      ...config,
      baseUrl: 'https://api.cdr.bendigobank.com.au/cds-au/v1'
    };
  }

  // Step 1: Get authorization URL for user consent
  getAuthorizationUrl(): string {
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: this.config.clientId,
      redirect_uri: this.config.redirectUri,
      scope: 'bank:accounts.basic:read bank:accounts.detail:read bank:transactions:read',
      state: 'mareeba-club-' + Date.now()
    });

    return `${this.config.baseUrl}/oauth/authorize?${params.toString()}`;
  }

  // Step 2: Exchange authorization code for access token
  async exchangeCodeForToken(authorizationCode: string): Promise<void> {
    try {
      const response = await fetch(`${this.config.baseUrl}/oauth/token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'x-v': '1',
          'x-min-v': '1'
        },
        body: new URLSearchParams({
          grant_type: 'authorization_code',
          client_id: this.config.clientId,
          client_secret: this.config.clientSecret,
          code: authorizationCode,
          redirect_uri: this.config.redirectUri
        })
      });

      if (!response.ok) {
        throw new Error(`Token exchange failed: ${response.status}`);
      }

      const data = await response.json();
      this.accessToken = data.access_token;
      this.refreshToken = data.refresh_token;
      
      // Store tokens securely (you might want to encrypt these)
      localStorage.setItem('bendigo_access_token', this.accessToken);
      localStorage.setItem('bendigo_refresh_token', this.refreshToken);
    } catch (error) {
      console.error('Token exchange failed:', error);
      throw error;
    }
  }

  // Refresh access token when expired
  async refreshAccessToken(): Promise<void> {
    if (!this.refreshToken) {
      throw new Error('No refresh token available');
    }

    try {
      const response = await fetch(`${this.config.baseUrl}/oauth/token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'x-v': '1',
          'x-min-v': '1'
        },
        body: new URLSearchParams({
          grant_type: 'refresh_token',
          client_id: this.config.clientId,
          client_secret: this.config.clientSecret,
          refresh_token: this.refreshToken
        })
      });

      const data = await response.json();
      this.accessToken = data.access_token;
      
      localStorage.setItem('bendigo_access_token', this.accessToken);
    } catch (error) {
      console.error('Token refresh failed:', error);
      throw error;
    }
  }

  // Get account information
  async getAccounts(): Promise<CDRAccount[]> {
    await this.ensureValidToken();

    try {
      const response = await fetch(`${this.config.baseUrl}/banking/accounts`, {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'x-v': '1',
          'x-min-v': '1',
          'x-fapi-interaction-id': this.generateInteractionId()
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch accounts: ${response.status}`);
      }

      const data = await response.json();
      return data.data.accounts || [];
    } catch (error) {
      console.error('Failed to fetch accounts:', error);
      throw error;
    }
  }

  // Get transactions for a specific account
  async getTransactions(accountId: string, fromDate?: string, toDate?: string): Promise<CDRTransaction[]> {
    await this.ensureValidToken();

    const params = new URLSearchParams();
    if (fromDate) params.append('oldest-time', fromDate);
    if (toDate) params.append('newest-time', toDate);

    try {
      const url = `${this.config.baseUrl}/banking/accounts/${accountId}/transactions${params.toString() ? '?' + params.toString() : ''}`;
      
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'x-v': '1',
          'x-min-v': '1',
          'x-fapi-interaction-id': this.generateInteractionId()
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch transactions: ${response.status}`);
      }

      const data = await response.json();
      return data.data.transactions || [];
    } catch (error) {
      console.error('Failed to fetch transactions:', error);
      throw error;
    }
  }

  // Check for recent payments (credits) that might be session payments
  async checkForSessionPayments(days: number = 7): Promise<{
    transactionId: string;
    amount: number;
    reference: string;
    description: string;
    date: string;
    possibleBookingRef?: string;
  }[]> {
    const fromDate = new Date();
    fromDate.setDate(fromDate.getDate() - days);
    
    const transactions = await this.getTransactions(
      this.config.accountId,
      fromDate.toISOString(),
      new Date().toISOString()
    );

    // Filter for incoming payments that could be session fees
    const sessionPayments = transactions
      .filter(t => 
        t.type === 'TRANSFER_INCOMING' && 
        t.status === 'POSTED' &&
        parseFloat(t.amount) >= 15 && // Minimum session fee
        parseFloat(t.amount) <= 50    // Maximum reasonable session fee
      )
      .map(t => {
        const possibleRef = this.extractBookingReference(t.description + ' ' + t.reference);
        return {
          transactionId: t.transactionId,
          amount: parseFloat(t.amount),
          reference: t.reference,
          description: t.description,
          date: t.postingDateTime || t.valueDateTime || '',
          possibleBookingRef: possibleRef
        };
      });

    return sessionPayments;
  }

  // Extract potential booking references from transaction descriptions
  private extractBookingReference(text: string): string | null {
    const patterns = [
      /BOOKING[:-]?\s*([A-Z0-9]{5,})/i,
      /REF[:-]?\s*([A-Z0-9]{5,})/i,
      /MAREEBA[:-]?\s*([A-Z0-9]{5,})/i,
      /BADMINTON[:-]?\s*([A-Z0-9]{5,})/i,
      /([0-9]{5})/,  // 5-digit player IDs
    ];

    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) {
        return match[1];
      }
    }

    return null;
  }

  // Ensure we have a valid access token
  private async ensureValidToken(): Promise<void> {
    if (!this.accessToken) {
      // Try to load from storage
      this.accessToken = localStorage.getItem('bendigo_access_token');
      this.refreshToken = localStorage.getItem('bendigo_refresh_token');
    }

    if (!this.accessToken) {
      throw new Error('No access token available. User needs to authorize.');
    }

    // You might want to add token expiry checking here
    // and automatically refresh if needed
  }

  // Generate unique interaction ID for each API call (CDR requirement)
  private generateInteractionId(): string {
    return 'mareeba-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
  }

  // Check if user has authorized the application
  isAuthorized(): boolean {
    return !!(this.accessToken || localStorage.getItem('bendigo_access_token'));
  }
}

export default BendigoBankCDRService;