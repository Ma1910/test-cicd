export interface Product {
  id: string;
  name: string;
  category: string;
  price: number;
  stock: number;
  createdAt: string;
}

export class ProductRepository {
  private products: Map<string, Product> = new Map();

  constructor() {
    this.seedDefaults();
  }

  private seedDefaults(): void {
    const initial: Product[] = [
      { id: "prod_1", name: "Cloud Native DevOps Handbook", category: "Books", price: 49.99, stock: 120, createdAt: new Date().toISOString() },
      { id: "prod_2", name: "Kubernetes Cluster Key", category: "Hardware", price: 129.00, stock: 45, createdAt: new Date().toISOString() },
      { id: "prod_3", name: "CI/CD Pipeline Monitoring Sensor", category: "IoT", price: 89.50, stock: 80, createdAt: new Date().toISOString() },
    ];
    for (const p of initial) {
      this.products.set(p.id, p);
    }
  }

  findAll(query?: { search?: string; category?: string }): Product[] {
    let list = Array.from(this.products.values());
    if (query?.search) {
      const s = query.search.toLowerCase();
      list = list.filter((p) => p.name.toLowerCase().includes(s));
    }
    if (query?.category) {
      list = list.filter((p) => p.category.toLowerCase() === query.category?.toLowerCase());
    }
    return list;
  }

  findById(id: string): Product | null {
    return this.products.get(id) || null;
  }

  create(data: { name: string; category: string; price: number; stock: number }): Product {
    const id = `prod_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    const product: Product = {
      id,
      name: data.name.trim(),
      category: data.category.trim(),
      price: data.price,
      stock: data.stock,
      createdAt: new Date().toISOString(),
    };
    this.products.set(id, product);
    return product;
  }

  delete(id: string): boolean {
    return this.products.delete(id);
  }

  count(): number {
    return this.products.size;
  }

  reset(): void {
    this.products.clear();
    this.seedDefaults();
  }
}

export const productRepo = new ProductRepository();
