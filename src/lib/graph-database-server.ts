import { GraphDatabase, Node } from './graph-database';
import fs from 'fs';
import path from 'path';

const DATA_DIR = path.join(process.cwd(), 'data');
const DB_FILE_PATH = path.join(DATA_DIR, 'graph-database-migrated.json');

interface DatabaseStats {
  totalNodes: number;
  totalRelationships: number;
  nodesByType: Record<string, number>;
}

// Server-side singleton with persistence
class GraphDatabaseServer {
  private static instance: GraphDatabase | null = null;
  private static isInitialized = false;
  private static isLoading = false;

  private static async ensureDataDirectory(): Promise<void> {
    try {
      await fs.promises.mkdir(DATA_DIR, { recursive: true });
    } catch (error) {
      console.error('[GraphDB Server] Error creating data directory:', error);
    }
  }

  private static async saveToFile(): Promise<void> {
    if (!this.instance) return;
    
    try {
      await this.ensureDataDirectory();
      
      const data = {
        nodes: Array.from(this.instance.nodes.entries()),
        relationships: Array.from(this.instance.relationships.entries()),
        nodeTypeIndex: Array.from(this.instance.nodeTypeIndex.entries()).map(([type, ids]) => [
          type, 
          Array.from(ids)
        ])
      };
      
      await fs.promises.writeFile(DB_FILE_PATH, JSON.stringify(data, null, 2), 'utf-8');
      console.log('[GraphDB Server] Database saved to disk');
    } catch (error) {
      console.error('[GraphDB Server] Error saving database:', error);
    }
  }

  private static async loadFromFile(): Promise<void> {
    try {
      if (!fs.existsSync(DB_FILE_PATH)) {
        console.log('[GraphDB Server] No existing database file found, starting fresh.');
        this.instance = new GraphDatabase();
        return;
      }

      const raw = await fs.promises.readFile(DB_FILE_PATH, 'utf-8');
      if (!raw) {
        console.warn('[GraphDB Server] Database file is empty, starting fresh.');
        this.instance = new GraphDatabase();
        return;
      }

      const data = JSON.parse(raw);
      const db = new GraphDatabase();

      if (data.nodes && Array.isArray(data.nodes)) {
        // Handle migrated data format (nodes as objects) vs old format ([id, node] pairs)
        if (data.nodes.length > 0 && Array.isArray(data.nodes[0])) {
          // Old format: [id, node] pairs
        db.nodes = new Map(data.nodes);
        } else {
          // New migrated format: nodes as objects
          const nodeMap = new Map();
          data.nodes.forEach((node: Node) => {
            if (node && node.id) {
              nodeMap.set(node.id, node);
            }
          });
          db.nodes = nodeMap;
        }
      }
      
      if (data.relationships && Array.isArray(data.relationships)) {
        db.relationships = new Map(data.relationships);
      }

      if (data.nodeTypeIndex && Array.isArray(data.nodeTypeIndex)) {
        db.nodeTypeIndex = new Map(data.nodeTypeIndex.map(([type, ids]:[string, string[]]) => [type, new Set(ids)]));
      } else {
        // Rebuild nodeTypeIndex from nodes if not present
        const typeIndex = new Map();
        for (const [id, node] of db.nodes) {
          if (node && node.type) {
            if (!typeIndex.has(node.type)) {
              typeIndex.set(node.type, new Set());
            }
            typeIndex.get(node.type)!.add(id);
          }
        }
        db.nodeTypeIndex = typeIndex;
      }

      this.instance = db;
      console.log(`[GraphDB Server] Database loaded from disk with ${db.nodes.size} nodes`);
    } catch (error) {
      console.error('[GraphDB Server] Error loading database, initializing a new one:', error);
      this.instance = new GraphDatabase();
    }
  }

  static async getInstance(): Promise<GraphDatabase> {
    if (this.isLoading) {
      await new Promise(resolve => {
        const interval = setInterval(() => {
          if (!this.isLoading) {
            clearInterval(interval);
            resolve(null);
          }
        }, 50);
      });
      return this.instance!;
    }

    if (!this.instance) {
      this.isLoading = true;
      try {
        this.instance = new GraphDatabase();
        await this.loadFromFile();
        this.isInitialized = true;
        console.log('[GraphDB Server] Singleton instance created');
      } finally {
        this.isLoading = false;
      }
    }
    return this.instance;
  }

  static async addNode(node: Node): Promise<string> {
    const db = await this.getInstance();
    db.addNode(node);
    await this.saveToFile();
    return node.id;
  }

  /*
  static async createRelationship(
    fromId: string, 
    toId: string, 
    type: any, 
    properties?: Record<string, any>
  ): Promise<void> {
    const db = await this.getInstance();
    db.createRelationship(fromId, toId, type, properties);
    await this.saveToFile();
  }

  static async clear(): Promise<void> {
    const db = await this.getInstance();
    db.clear();
    await this.saveToFile();
  }
  */

  static async getAllNodes(type?: string): Promise<Node[]> {
    const db = await this.getInstance();
    return db.getAllNodes(type);
  }

  static async getRelatedNodes(nodeId: string, relationshipType: string): Promise<Node[]> {
    const db = await this.getInstance();
    return db.getRelatedNodes(nodeId, relationshipType);
  }

  static async getNode(nodeId: string): Promise<Node | null> {
    const db = await this.getInstance();
    return db.getNode(nodeId) || null;
  }

  static async getStats(): Promise<DatabaseStats> {
    const db = await this.getInstance();
    return db.getStats();
  }

  static isReady(): boolean {
    return this.isInitialized && this.instance !== null;
  }

  static async reset(): Promise<void> {
    this.instance = new GraphDatabase();
    await this.saveToFile();
    console.log('[GraphDB Server] Database reset');
  }

  static async destroy(): Promise<void> {
    this.instance = null;
    this.isInitialized = false;
    console.log('[GraphDB Server] Singleton instance destroyed');
  }
}

// Export convenience functions
export async function getGraphDatabaseServer(): Promise<GraphDatabase> {
  return GraphDatabaseServer.getInstance();
}

export async function addNodeToDatabase(node: Node): Promise<string> {
  return GraphDatabaseServer.addNode(node);
}

export async function createRelationshipInDatabase(): Promise<void> {
  // await GraphDatabaseServer.createRelationship(fromId, toId, type, properties);
}

export async function getAllNodesFromDatabase(type?: string): Promise<Node[]> {
  return GraphDatabaseServer.getAllNodes(type);
}

export async function getRelatedNodesFromDatabase(nodeId: string, relationshipType: string): Promise<Node[]> {
  return GraphDatabaseServer.getRelatedNodes(nodeId, relationshipType);
}

export async function getNodeFromDatabase(nodeId: string): Promise<Node | null> {
  return GraphDatabaseServer.getNode(nodeId);
}

export async function getDatabaseStats(): Promise<DatabaseStats> {
  return GraphDatabaseServer.getStats();
}

export async function getAllRelationshipsFromDatabase(): Promise<unknown[]> {
  const db = await GraphDatabaseServer.getInstance();
  return db.getAllRelationships();
}

export function isDatabaseReady(): boolean {
  return GraphDatabaseServer.isReady();
}

export async function resetDatabase(): Promise<void> {
  await GraphDatabaseServer.reset();
}

export async function destroyDatabase(): Promise<void> {
  await GraphDatabaseServer.destroy();
}

export { GraphDatabaseServer }; 