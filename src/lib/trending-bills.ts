export interface TrendingBill {
  id: string;
  title: string;
  billNumber: string;
  sponsor: string;
  party: string;
  state: string;
  lastAction: string;
  introducedDate: string;
  chamber: string;
  clickCount: number;
  searchCount: number;
  lastInteraction: Date;
  priority: number;
  summary?: string;
}

class TrendingBillsTracker {
  private bills: Map<string, TrendingBill> = new Map();
  private readonly MAX_TRENDING_BILLS = 10;
  private readonly DECAY_FACTOR = 0.95; // Decay factor for older interactions

  // Track a bill interaction (click or search)
  trackInteraction(billId: string, billData: any, interactionType: 'click' | 'search') {
    const now = new Date();
    
    if (this.bills.has(billId)) {
      const existing = this.bills.get(billId)!;
      existing.clickCount += interactionType === 'click' ? 1 : 0;
      existing.searchCount += interactionType === 'search' ? 1 : 0;
      existing.lastInteraction = now;
      existing.priority = this.calculatePriority(existing);
    } else {
      const newBill: TrendingBill = {
        id: billId,
        title: billData.title || 'Unknown Bill',
        billNumber: billData.number || billData.billNumber || 'Unknown',
        sponsor: billData.sponsor?.fullName || billData.sponsor || 'Unknown',
        party: billData.sponsor?.party || 'Unknown',
        state: billData.sponsor?.state || 'Unknown',
        lastAction: billData.lastAction || billData.last_action || 'Unknown',
        introducedDate: billData.introducedDate || billData.introduced_date || 'Unknown',
        chamber: billData.chamber || 'Unknown',
        clickCount: interactionType === 'click' ? 1 : 0,
        searchCount: interactionType === 'search' ? 1 : 0,
        lastInteraction: now,
        priority: 1,
        summary: billData.summary
      };
      this.bills.set(billId, newBill);
    }

    // Apply decay to all bills
    this.applyDecay();
    
    // Keep only top trending bills
    this.trimToMaxSize();
  }

  // Calculate priority based on interactions and recency
  private calculatePriority(bill: TrendingBill): number {
    const hoursSinceInteraction = (Date.now() - bill.lastInteraction.getTime()) / (1000 * 60 * 60);
    const recencyFactor = Math.pow(this.DECAY_FACTOR, hoursSinceInteraction / 24); // Daily decay
    
    return (bill.clickCount * 2 + bill.searchCount) * recencyFactor;
  }

  // Apply decay to all bills
  private applyDecay() {
    for (const bill of this.bills.values()) {
      bill.priority = this.calculatePriority(bill);
    }
  }

  // Keep only the top trending bills
  private trimToMaxSize() {
    if (this.bills.size <= this.MAX_TRENDING_BILLS) return;

    const sortedBills = Array.from(this.bills.entries())
      .sort(([, a], [, b]) => b.priority - a.priority)
      .slice(0, this.MAX_TRENDING_BILLS);

    this.bills = new Map(sortedBills);
  }

  // Get trending bills sorted by priority
  getTrendingBills(limit: number = 5): TrendingBill[] {
    this.applyDecay(); // Update priorities before returning
    
    return Array.from(this.bills.values())
      .sort((a, b) => b.priority - a.priority)
      .slice(0, limit);
  }

  // Get bill by ID
  getBill(billId: string): TrendingBill | undefined {
    return this.bills.get(billId);
  }

  // Clear all trending data
  clear() {
    this.bills.clear();
  }

  // Get stats for debugging
  getStats() {
    return {
      totalBills: this.bills.size,
      totalClicks: Array.from(this.bills.values()).reduce((sum, bill) => sum + bill.clickCount, 0),
      totalSearches: Array.from(this.bills.values()).reduce((sum, bill) => sum + bill.searchCount, 0),
      topBill: this.getTrendingBills(1)[0]
    };
  }
}

// Export singleton instance
export const trendingBillsTracker = new TrendingBillsTracker();

// Helper functions for API routes
export const trackBillClick = (billId: string, billData: any) => {
  trendingBillsTracker.trackInteraction(billId, billData, 'click');
};

export const trackBillSearch = (billId: string, billData: any) => {
  trendingBillsTracker.trackInteraction(billId, billData, 'search');
}; 