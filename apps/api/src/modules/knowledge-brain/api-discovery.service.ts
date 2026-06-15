import { Injectable } from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';

export interface EndpointEntry {
  method: string;
  path: string;
  handler: string;
}

@Injectable()
export class ApiDiscoveryService {
  private catalog: EndpointEntry[] | null = null;

  constructor(private readonly httpAdapterHost: HttpAdapterHost) {}

  private buildCatalog(): EndpointEntry[] {
    if (this.catalog) return this.catalog;

    const httpAdapter = this.httpAdapterHost.httpAdapter;
    const server = httpAdapter.getInstance();

    const entries: EndpointEntry[] = [];

    // Express router stack traversal
    const routerStack: any[] = server?.router?.stack ?? server?._router?.stack ?? [];
    for (const layer of routerStack) {
      if (layer.route) {
        const route = layer.route;
        const methods = Object.keys(route.methods).filter((m) => route.methods[m]);
        for (const method of methods) {
          entries.push({
            method: method.toUpperCase(),
            path: route.path,
            handler: route.stack?.[0]?.name || 'anonymous',
          });
        }
      } else if (layer.name === 'router' && layer.handle?.stack) {
        for (const innerLayer of layer.handle.stack) {
          if (innerLayer.route) {
            const route = innerLayer.route;
            const methods = Object.keys(route.methods).filter((m) => route.methods[m]);
            for (const method of methods) {
              entries.push({
                method: method.toUpperCase(),
                path: route.path,
                handler: route.stack?.[0]?.name || 'anonymous',
              });
            }
          }
        }
      }
    }

    this.catalog = entries.sort((a, b) => a.path.localeCompare(b.path));
    return this.catalog;
  }

  getEndpointCatalog() {
    const endpoints = this.buildCatalog();

    const byMethod: Record<string, number> = {};
    const byPrefix: Record<string, EndpointEntry[]> = {};

    for (const ep of endpoints) {
      byMethod[ep.method] = (byMethod[ep.method] ?? 0) + 1;

      const prefix = ep.path.split('/').slice(0, 3).join('/') || '/';
      if (!byPrefix[prefix]) byPrefix[prefix] = [];
      byPrefix[prefix].push(ep);
    }

    return {
      total: endpoints.length,
      byMethod,
      prefixGroups: Object.entries(byPrefix).map(([prefix, eps]) => ({
        prefix,
        count: eps.length,
        endpoints: eps,
      })),
    };
  }

  getEndpointRegistry() {
    const endpoints = this.buildCatalog();
    return {
      total: endpoints.length,
      endpoints,
    };
  }

  searchEndpoints(query: string) {
    const endpoints = this.buildCatalog();
    const q = query.toLowerCase();
    return endpoints.filter(
      (ep) => ep.path.toLowerCase().includes(q) || ep.method.toLowerCase().includes(q),
    );
  }
}
