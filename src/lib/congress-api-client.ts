// Congress.gov API Client - Political Intelligence Engine

export interface CommitteeData {
  name: string;
  jurisdiction?: string;
  billCount?: number;
  leadership?: {
    chair: string;
    rankingMember: string;
  };
}

export interface MemberData {
  name: string;
  title: string;
  party: string;
  state: string;
  district?: string;
  committees?: string[];
  leadershipPositions?: string[];
}

export interface BillData {
  number: string;
  title: string;
  status: string;
  sponsor: string;
  cosponsors?: any[];
  committees?: string[];
  lastAction?: string;
  introducedDate?: string;
}

export class CongressApiClient {
  private apiKey: string | null = null;
  private baseUrl = 'https://api.congress.gov/v3';
  private rateLimitDelay = 1000; // 1 second between requests
  private lastRequestTime = 0;
  private cache = new Map<string, { data: any; timestamp: number; ttl: number }>();

  constructor() {
    // In a real implementation, this would come from environment variables
    this.apiKey = process.env.CONGRESS_API_KEY || null;
  }

  private async makeRequest(endpoint: string, params: Record<string, string> = {}): Promise<any> {
    const url = new URL(`${this.baseUrl}${endpoint}`);
    
    // Add API key as query parameter
    if (this.apiKey) {
      url.searchParams.set('api_key', this.apiKey);
    }
    // Add other parameters
    Object.entries(params).forEach(([key, value]) => {
      url.searchParams.set(key, value);
    });

    // Rate limiting
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;
    if (timeSinceLastRequest < this.rateLimitDelay) {
      await new Promise(resolve => setTimeout(resolve, this.rateLimitDelay - timeSinceLastRequest));
    }
    this.lastRequestTime = Date.now();

    try {
      const response = await fetch(url.toString(), {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; KnowYourVoteKYBot/1.0; +https://knowyourvotekentucky.org)',
          'Accept': 'application/json',
        }
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error(`API request failed for ${endpoint}:`, error);
      return null;
    }
  }

  private getCacheKey(endpoint: string, params: Record<string, string> = {}): string {
    const paramString = Object.entries(params).sort().map(([k, v]) => `${k}=${v}`).join('&');
    return `${endpoint}?${paramString}`;
  }

  private isCacheValid(key: string): boolean {
    const cached = this.cache.get(key);
    if (!cached) return false;
    return Date.now() - cached.timestamp < cached.ttl;
  }

  private setCache(key: string, data: any, ttl: number): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl
    });
  }

  async getCommittee(code: string): Promise<CommitteeData | null> {
    const cacheKey = this.getCacheKey('/committees', { committee_id: code });
    
    if (this.isCacheValid(cacheKey)) {
      return this.cache.get(cacheKey)!.data;
    }

    try {
      const data = await this.makeRequest('/committees', { committee_id: code });
      if (data && data.committees && data.committees.length > 0) {
        const committee = data.committees[0];
        const result: CommitteeData = {
          name: committee.name,
          jurisdiction: committee.jurisdiction,
          billCount: committee.billCount || 0,
          leadership: committee.leadership
        };
        
        this.setCache(cacheKey, result, 7 * 24 * 60 * 60 * 1000); // 1 week
        return result;
      }
    } catch (error) {
      console.error(`Failed to fetch committee ${code}:`, error);
    }

    return null;
  }

  async getMember(bioguideId: string): Promise<MemberData | null> {
    const cacheKey = this.getCacheKey('/members', { bioguide_id: bioguideId });
    
    if (this.isCacheValid(cacheKey)) {
      return this.cache.get(cacheKey)!.data;
    }

    try {
      const data = await this.makeRequest('/members', { bioguide_id: bioguideId });
      if (data && data.members && data.members.length > 0) {
        const member = data.members[0];
        const result: MemberData = {
          name: member.name,
          title: member.title,
          party: member.party,
          state: member.state,
          district: member.district,
          committees: member.committees?.map((c: any) => c.name) || [],
          leadershipPositions: member.leadershipPositions || []
        };
        
        this.setCache(cacheKey, result, 7 * 24 * 60 * 60 * 1000); // 1 week
        return result;
      }
    } catch (error) {
      console.error(`Failed to fetch member ${bioguideId}:`, error);
    }

    return null;
  }

  async getBill(billNumber: string): Promise<BillData | null> {
    // Use /bill endpoint (not /bills)
    const cacheKey = this.getCacheKey('/bill', { bill_id: billNumber });
    if (this.isCacheValid(cacheKey)) {
      return this.cache.get(cacheKey)!.data;
    }
    try {
      const data = await this.makeRequest('/bill', { bill_id: billNumber });
      if (data && data.bills && data.bills.length > 0) {
        const bill = data.bills[0];
        const result: BillData = {
          number: bill.number,
          title: bill.title,
          status: bill.status,
          sponsor: bill.sponsor?.name || 'Unknown',
          cosponsors: bill.cosponsors || [],
          committees: bill.committees?.map((c: any) => c.name) || [],
          lastAction: bill.lastAction?.text,
          introducedDate: bill.introducedDate
        };
        this.setCache(cacheKey, result, 24 * 60 * 60 * 1000); // 1 day
        return result;
      }
    } catch (error) {
      console.error(`Failed to fetch bill ${billNumber}:`, error);
    }
    return null;
  }

  async searchBills(query: string, limit: number = 10): Promise<BillData[]> {
    // Use /bill endpoint (not /bills)
    const cacheKey = this.getCacheKey('/bill', { query, limit: limit.toString() });
    if (this.isCacheValid(cacheKey)) {
      return this.cache.get(cacheKey)!.data;
    }
    try {
      const data = await this.makeRequest('/bill', { query, limit: limit.toString() });
      if (data && data.bills) {
        const results: BillData[] = data.bills.map((bill: any) => ({
          number: bill.number,
          title: bill.title,
          status: bill.status,
          sponsor: bill.sponsor?.name || 'Unknown',
          cosponsors: bill.cosponsors || [],
          committees: bill.committees?.map((c: any) => c.name) || [],
          lastAction: bill.lastAction?.text,
          introducedDate: bill.introducedDate
        }));
        this.setCache(cacheKey, results, 24 * 60 * 60 * 1000); // 1 day
        return results;
      }
    } catch (error) {
      console.error('Failed to search bills:', error);
    }
    return [];
  }

  async getRecentActivity(days: number = 7): Promise<any[]> {
    const cacheKey = this.getCacheKey('/activity', { days: days.toString() });
    
    if (this.isCacheValid(cacheKey)) {
      return this.cache.get(cacheKey)!.data;
    }

    try {
      // This would be a custom endpoint in a real implementation
      const data = await this.makeRequest('/activity', { days: days.toString() });
      if (data && data.results) {
        this.setCache(cacheKey, data.results, 30 * 60 * 1000); // 30 minutes
        return data.results;
      }
    } catch (error) {
      console.error(`Failed to fetch recent activity:`, error);
    }

    return [];
  }

  async getMembersByState(state: string): Promise<MemberData[]> {
    const cacheKey = this.getCacheKey('/members', { state });
    
    if (this.isCacheValid(cacheKey)) {
      return this.cache.get(cacheKey)!.data;
    }

    try {
      const data = await this.makeRequest('/members', { state });
      if (data && data.members) {
        const results: MemberData[] = data.members.map((member: any) => ({
          name: member.name,
          title: member.title,
          party: member.party,
          state: member.state,
          district: member.district,
          committees: member.committees?.map((c: any) => c.name) || [],
          leadershipPositions: member.leadershipPositions || []
        }));
        
        this.setCache(cacheKey, results, 7 * 24 * 60 * 60 * 1000); // 1 week
        return results;
      }
    } catch (error) {
      console.error(`Failed to fetch members for state ${state}:`, error);
    }

    return [];
  }

  // Mock data for development/testing
  getMockCommitteeData(code: string): CommitteeData | null {
    const mockData: Record<string, CommitteeData> = {
      'HSJU': {
        name: 'House Judiciary Committee',
        jurisdiction: 'Federal courts, civil liberties, constitutional rights, immigration, antitrust',
        billCount: 45,
        leadership: {
          chair: 'Rep. Jim Jordan (R-OH)',
          rankingMember: 'Rep. Jerry Nadler (D-NY)'
        }
      },
      'SSJU': {
        name: 'Senate Judiciary Committee',
        jurisdiction: 'Federal courts, civil liberties, constitutional rights, immigration, antitrust',
        billCount: 32,
        leadership: {
          chair: 'Sen. Dick Durbin (D-IL)',
          rankingMember: 'Sen. Lindsey Graham (R-SC)'
        }
      }
    };

    return mockData[code] || null;
  }

  getMockMemberData(bioguideId: string): MemberData | null {
    const mockData: Record<string, MemberData> = {
      'J000289': {
        name: 'Rep. Jim Jordan',
        title: 'Representative',
        party: 'R',
        state: 'OH',
        district: '4',
        committees: ['House Judiciary Committee'],
        leadershipPositions: ['Chair, House Judiciary Committee']
      },
      'N000002': {
        name: 'Rep. Jerry Nadler',
        title: 'Representative',
        party: 'D',
        state: 'NY',
        district: '12',
        committees: ['House Judiciary Committee'],
        leadershipPositions: ['Ranking Member, House Judiciary Committee']
      }
    };

    return mockData[bioguideId] || null;
  }

  async getBillActions(billNumber: string): Promise<any[]> {
    // Congress.gov API expects bill type and number separately, e.g. hr1234
    // We'll assume billNumber is in the format 'hr1234' or 's5678'
    const match = billNumber.match(/([a-z]+)(\d+)/i);
    if (!match) return [];
    const [_, billType, number] = match;
    const endpoint = `/bill/${billType}/${number}/actions`;
    const cacheKey = this.getCacheKey(endpoint);
    if (this.isCacheValid(cacheKey)) {
      return this.cache.get(cacheKey)!.data;
    }
    try {
      const data = await this.makeRequest(endpoint);
      const actions = data?.actions || [];
      this.setCache(cacheKey, actions, 24 * 60 * 60 * 1000); // 1 day
      return actions;
    } catch (error) {
      console.error(`Failed to fetch actions for bill ${billNumber}:`, error);
      return [];
    }
  }
}
