// TypeScript interfaces for graph node types
export interface Video {
  id: string;
  type: 'Video';
  metadata: {
    title: string;
    date: string;
    duration: number;
    url: string;
    chamber?: string;
    eventType?: string;
    videoId?: string;
    transcript?: string;
    summary?: string;
    wordCount?: number;
    keyTopics?: string[];
    // Enhanced analysis fields
    billInfo?: {
      billNumber?: string;
      billTitle?: string;
      sponsor?: {
        name?: string;
        party?: string;
        state?: string;
        chamber?: string;
      };
      cosponsors?: Array<{
        name?: string;
        party?: string;
        state?: string;
      }>;
      status?: string;
      introducedDate?: string;
      lastAction?: string;
    };
    keySpeakers?: Array<{
      name: string;
      role: string;
      party?: string;
      state?: string;
      keyStatements?: string[];
    }>;
    decisions?: string[];
    actions?: string[];
    context?: {
      chamber: string;
      committee?: string;
      date: string;
      session: string;
      type: 'hearing' | 'floor' | 'markup' | 'nomination' | 'other';
    };
    relatedBills?: string[];
    amendments?: string[];
    votes?: Array<{
      description: string;
      result: string;
      yeas: number;
      nays: number;
    }>;
  };
}

export interface Speaker {
  id: string;
  type: 'Speaker';
  name: string;
  title?: string;
  party?: string;
  organization?: string;
}

export interface Topic {
  id: string;
  type: 'Topic';
  subject: string;
  category?: string;
  description?: string;
}

export interface Bill {
  id: string;
  type: 'Bill';
  billNumber: string;
  title: string;
  congress?: number;
  status?: string;
  summary?: string;
}

export interface Event {
  id: string;
  type: 'Event';
  name: string;
  eventType: 'hearing' | 'session' | 'debate' | 'vote' | 'other';
  date: string;
  chamber?: string;
  description?: string;
}

// Union type for all node types
export type Node = Video | Speaker | Topic | Bill | Event;

// Relationship types
export type RelationshipType = 
  | 'FEATURES' // Video -> Speaker
  | 'DISCUSSES' // Video -> Topic
  | 'REFERENCES' // Video -> Bill
  | 'PART_OF' // Video -> Event
  | 'SPEAKS_ON' // Speaker -> Topic
  | 'SPONSORS' // Speaker -> Bill
  | 'ATTENDS' // Speaker -> Event
  | 'RELATED_TO' // Topic -> Topic
  | 'IMPACTS' // Bill -> Topic
  | 'CO_SPONSORS' // Speaker -> Speaker
  | 'CHAIRS' // Speaker -> Event
  | 'MODERATES'; // Speaker -> Event

export interface Relationship {
  from: string;
  to: string;
  type: string;
  label: string;
}

export class GraphDatabase {
  nodes: Map<string, Node> = new Map();
  relationships: Map<string, Relationship[]> = new Map();
  nodeTypeIndex: Map<string, Set<string>> = new Map();

  constructor(data?: {
    nodes: [string, Node][];
    relationships: [string, Relationship[]][];
    nodeTypeIndex: [string, Set<string>][];
  }) {
    if (data) {
      if (data.nodes) {
        this.nodes = new Map(data.nodes);
      }
      if (data.relationships) {
        this.relationships = new Map(data.relationships);
      }
      if (data.nodeTypeIndex) {
        this.nodeTypeIndex = new Map(data.nodeTypeIndex);
      }
    }
  }

  addNode(node: Node): void {
    if (this.nodes.has(node.id)) {
      // console.warn(`[GraphDB] Node with id ${node.id} already exists, skipping add.`);
      return;
    }
    this.nodes.set(node.id, node);

    if (!this.nodeTypeIndex.has(node.type)) {
      this.nodeTypeIndex.set(node.type, new Set());
    }
    this.nodeTypeIndex.get(node.type)!.add(node.id);
  }

  getNode(id: string): Node | undefined {
    return this.nodes.get(id);
  }

  getAllNodes(type?: string): Node[] {
    if (type) {
      const nodeIds = this.nodeTypeIndex.get(type) || new Set();
      return Array.from(nodeIds)
        .map(id => this.nodes.get(id))
        .filter((node): node is Node => node !== undefined);
    }
    return Array.from(this.nodes.values());
  }

  addRelationship(fromId: string, toId: string, type: string, label: string): void {
    if (!this.nodes.has(fromId) || !this.nodes.has(toId)) {
      console.error(`Cannot create relationship between non-existent nodes: ${fromId}, ${toId}`);
      return;
    }

    const relationship: Relationship = { from: fromId, to: toId, type, label };
    
    if (!this.relationships.has(fromId)) {
      this.relationships.set(fromId, []);
    }
    
    const existingRels = this.relationships.get(fromId)!;
    const relationshipExists = existingRels.some(r => r.to === toId && r.type === type);

    if (!relationshipExists) {
      existingRels.push(relationship);
    }
  }

  getRelationships(fromId: string, type?: string): Relationship[] {
    const rels = this.relationships.get(fromId) || [];
    if (type) {
      return rels.filter(r => r.type === type);
    }
    return rels;
  }
  
  getIncomingRelationships(toId: string, type?: string): Relationship[] {
    const incoming: Relationship[] = [];
    for (const rels of this.relationships.values()) {
      for (const rel of rels) {
        if (rel.to === toId) {
          if (!type || rel.type === type) {
            incoming.push(rel);
          }
        }
      }
    }
    return incoming;
  }

  getRelatedNodes(nodeId: string, type?: string): Node[] {
    const relatedNodes: Node[] = [];
    const outgoing = this.getRelationships(nodeId, type);
    for (const rel of outgoing) {
      const node = this.nodes.get(rel.to);
      if (node) {
        relatedNodes.push(node);
      }
    }

    const incoming = this.getIncomingRelationships(nodeId, type);
    for (const rel of incoming) {
      const node = this.nodes.get(rel.from);
      if (node) {
        relatedNodes.push(node);
      }
    }
    
    // Remove duplicates
    return [...new Map(relatedNodes.map(n => [n.id, n])).values()];
  }

  getAllRelationships(): Relationship[] {
    return Array.from(this.relationships.values()).flat();
  }

  getStats() {
    return {
      totalNodes: this.nodes.size,
      totalRelationships: this.getAllRelationships().length,
      nodesByType: Object.fromEntries(
        Array.from(this.nodeTypeIndex.entries()).map(([type, ids]) => [type, ids.size])
      )
    };
  }

  toJSON() {
    return {
      nodes: Array.from(this.nodes.entries()),
      relationships: Array.from(this.relationships.entries()),
      nodeTypeIndex: Array.from(this.nodeTypeIndex.entries()).map(([type, ids]) => [type, Array.from(ids)])
    };
  }

  // Additional methods needed by graph-queries.ts
  getNodesByType(type: string): Node[] {
    return this.getAllNodes(type);
  }

  searchNodes(query: string, type?: string): Node[] {
    const nodes = type ? this.getAllNodes(type) : this.getAllNodes();
    return nodes.filter(node => {
      if (node.type === 'Video') {
        return node.metadata.title.toLowerCase().includes(query.toLowerCase());
      } else if (node.type === 'Speaker') {
        return node.name.toLowerCase().includes(query.toLowerCase());
      } else if (node.type === 'Topic') {
        return node.subject.toLowerCase().includes(query.toLowerCase());
      } else if (node.type === 'Bill') {
        return node.title.toLowerCase().includes(query.toLowerCase()) || 
               node.billNumber.toLowerCase().includes(query.toLowerCase());
      } else if (node.type === 'Event') {
        return node.name.toLowerCase().includes(query.toLowerCase());
      }
      return false;
    });
  }

  getConnectedNodes(nodeId: string, relationshipType: string, direction: 'outgoing' | 'incoming' = 'outgoing'): Array<{ node: Node; relationship: Relationship }> {
    const connections: Array<{ node: Node; relationship: Relationship }> = [];
    
    if (direction === 'outgoing') {
      const relationships = this.getRelationships(nodeId, relationshipType);
      for (const rel of relationships) {
        const node = this.nodes.get(rel.to);
        if (node) {
          connections.push({ node, relationship: rel });
        }
      }
    } else {
      const relationships = this.getIncomingRelationships(nodeId, relationshipType);
      for (const rel of relationships) {
        const node = this.nodes.get(rel.from);
        if (node) {
          connections.push({ node, relationship: rel });
        }
      }
    }
    
    return connections;
  }

  // Video-specific query methods
  findSpeakersByVideo(videoId: string): Speaker[] {
    const connections = this.getConnectedNodes(videoId, 'FEATURES');
    return connections
      .map(({ node }) => node)
      .filter((node): node is Speaker => node.type === 'Speaker');
  }

  findTopicsByVideo(videoId: string): Topic[] {
    const connections = this.getConnectedNodes(videoId, 'DISCUSSES');
    return connections
      .map(({ node }) => node)
      .filter((node): node is Topic => node.type === 'Topic');
  }

  findBillsByVideo(videoId: string): Bill[] {
    const connections = this.getConnectedNodes(videoId, 'REFERENCES');
    return connections
      .map(({ node }) => node)
      .filter((node): node is Bill => node.type === 'Bill');
  }

  findEventsByVideo(videoId: string): Event[] {
    const connections = this.getConnectedNodes(videoId, 'PART_OF');
    return connections
      .map(({ node }) => node)
      .filter((node): node is Event => node.type === 'Event');
  }

  // Speaker-specific query methods
  findVideosBySpeaker(speakerId: string): Video[] {
    const connections = this.getConnectedNodes(speakerId, 'FEATURES', 'incoming');
    return connections
      .map(({ node }) => node)
      .filter((node): node is Video => node.type === 'Video');
  }

  findTopicsBySpeaker(speakerId: string): Topic[] {
    const connections = this.getConnectedNodes(speakerId, 'SPEAKS_ON');
    return connections
      .map(({ node }) => node)
      .filter((node): node is Topic => node.type === 'Topic');
  }

  // Topic-specific query methods
  findVideosByTopic(topicId: string): Video[] {
    const connections = this.getConnectedNodes(topicId, 'DISCUSSES', 'incoming');
    return connections
      .map(({ node }) => node)
      .filter((node): node is Video => node.type === 'Video');
  }

  findSpeakersByTopic(topicId: string): Speaker[] {
    const connections = this.getConnectedNodes(topicId, 'SPEAKS_ON', 'incoming');
    return connections
      .map(({ node }) => node)
      .filter((node): node is Speaker => node.type === 'Speaker');
  }

  // Bill-specific query methods
  findVideosByBill(billId: string): Video[] {
    const connections = this.getConnectedNodes(billId, 'REFERENCES', 'incoming');
    return connections
      .map(({ node }) => node)
      .filter((node): node is Video => node.type === 'Video');
  }

  findSpeakersByBill(billId: string): Speaker[] {
    const connections = this.getConnectedNodes(billId, 'SPONSORS', 'incoming');
    return connections
      .map(({ node }) => node)
      .filter((node): node is Speaker => node.type === 'Speaker');
  }
}

// Utility functions for creating common node types
export const createVideoNode = (
  id: string,
  title: string,
  date: string,
  duration: number,
  url: string,
  metadata?: Partial<Video['metadata']>
): Video => ({
  id,
  type: 'Video',
  metadata: {
    title,
    date,
    duration,
    url,
    ...metadata
  }
});

export const createSpeakerNode = (
  id: string,
  name: string,
  title?: string,
  party?: string,
  organization?: string
): Speaker => ({
  id,
  type: 'Speaker',
  name,
  title,
  party,
  organization
});

export const createTopicNode = (
  id: string,
  subject: string,
  category?: string,
  description?: string
): Topic => ({
  id,
  type: 'Topic',
  subject,
  category,
  description
});

export const createBillNode = (
  id: string,
  billNumber: string,
  title: string,
  congress?: number,
  status?: string,
  summary?: string
): Bill => ({
  id,
  type: 'Bill',
  billNumber,
  title,
  congress,
  status,
  summary
});

export const createEventNode = (
  id: string,
  name: string,
  eventType: Event['eventType'],
  date: string,
  chamber?: string,
  description?: string
): Event => ({
  id,
  type: 'Event',
  name,
  eventType,
  date,
  chamber,
  description
}); 