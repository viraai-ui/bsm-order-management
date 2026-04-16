import type { ApiConfig } from '../lib/env.js';
import type { ZohoSalesOrder } from '../lib/zoho.js';

const SALES_ORDER_PAGE_SIZE = 200;

type ZohoConfig = NonNullable<ApiConfig['zoho']>;
type Fetcher = typeof fetch;

type ZohoTokenResponse = {
  access_token?: string;
  error?: string;
};

type ZohoSalesOrdersResponse = {
  salesorders?: ZohoSalesOrder[];
  page_context?: {
    has_more_page?: boolean;
  };
  message?: string;
  code?: number;
};

type ZohoSalesOrderDetailResponse = {
  salesorder?: ZohoSalesOrder;
  message?: string;
  code?: number;
};

export function createZohoClient(config: ZohoConfig, fetcher: Fetcher = fetch) {
  const apiBaseUrl = normalizeZohoApiBaseUrl(config.apiBaseUrl);
  const activeStatuses = new Set(config.activeStatuses.map((status) => status.toLowerCase()));

  return {
    async fetchSalesOrders(): Promise<ZohoSalesOrder[]> {
      const accessToken = await refreshAccessToken(apiBaseUrl, config, fetcher);
      const orders: ZohoSalesOrder[] = [];
      let page = 1;
      let hasMorePage = true;

      while (hasMorePage) {
        const response = await fetcher(buildSalesOrdersUrl(apiBaseUrl, config.organizationId, page), {
          headers: {
            Authorization: `Zoho-oauthtoken ${accessToken}`
          }
        });

        const payload = (await response.json()) as ZohoSalesOrdersResponse;

        if (!response.ok) {
          const errorMessage = payload.message ?? response.statusText ?? 'Unknown error';
          throw new Error(`Failed to fetch Zoho sales orders page ${page}: ${errorMessage}`);
        }

        const activeOrders = (payload.salesorders ?? []).filter((order) => activeStatuses.has(order.status.toLowerCase()));

        for (const order of activeOrders) {
          orders.push(await fetchSalesOrderDetail(apiBaseUrl, config.organizationId, accessToken, order.salesorder_id, fetcher));
        }

        hasMorePage = payload.page_context?.has_more_page === true;
        page += 1;
      }

      return orders;
    }
  };
}

async function refreshAccessToken(apiBaseUrl: string, config: ZohoConfig, fetcher: Fetcher): Promise<string> {
  const body = new URLSearchParams({
    refresh_token: config.refreshToken,
    client_id: config.clientId,
    client_secret: config.clientSecret,
    grant_type: 'refresh_token'
  });

  const response = await fetcher(buildZohoTokenUrl(apiBaseUrl), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8'
    },
    body: body.toString()
  });

  const payload = (await response.json()) as ZohoTokenResponse;

  if (!response.ok || !payload.access_token) {
    const errorMessage = payload.error ?? response.statusText ?? 'Unknown error';
    throw new Error(`Failed to refresh Zoho access token: ${errorMessage}`);
  }

  return payload.access_token;
}

async function fetchSalesOrderDetail(
  apiBaseUrl: string,
  organizationId: string,
  accessToken: string,
  salesOrderId: string,
  fetcher: Fetcher
): Promise<ZohoSalesOrder> {
  const response = await fetcher(buildSalesOrderDetailUrl(apiBaseUrl, organizationId, salesOrderId), {
    headers: {
      Authorization: `Zoho-oauthtoken ${accessToken}`
    }
  });

  const payload = (await response.json()) as ZohoSalesOrderDetailResponse;

  if (!response.ok || !payload.salesorder) {
    const errorMessage = payload.message ?? response.statusText ?? 'Unknown error';
    throw new Error(`Failed to fetch Zoho sales order ${salesOrderId}: ${errorMessage}`);
  }

  return payload.salesorder;
}

function buildSalesOrdersUrl(apiBaseUrl: string, organizationId: string, page: number) {
  const url = new URL(`${apiBaseUrl}/salesorders`);
  url.searchParams.set('organization_id', organizationId);
  url.searchParams.set('page', String(page));
  url.searchParams.set('per_page', String(SALES_ORDER_PAGE_SIZE));
  return url.toString();
}

function buildSalesOrderDetailUrl(apiBaseUrl: string, organizationId: string, salesOrderId: string) {
  const url = new URL(`${apiBaseUrl}/salesorders/${salesOrderId}`);
  url.searchParams.set('organization_id', organizationId);
  return url.toString();
}

function buildZohoTokenUrl(apiBaseUrl: string) {
  const apiHost = new URL(apiBaseUrl).hostname;

  if (apiHost.startsWith('www.zohoapis.')) {
    const domainSuffix = apiHost.slice('www.zohoapis.'.length);
    return `https://accounts.zoho.${domainSuffix}/oauth/v2/token`;
  }

  return 'https://accounts.zoho.com/oauth/v2/token';
}

function normalizeZohoApiBaseUrl(apiBaseUrl: string) {
  const url = new URL(apiBaseUrl);
  const pathname = url.pathname.replace(/\/+$/, '');

  if (pathname === '' || pathname === '/') {
    url.pathname = '/inventory/v1';
  }

  return url.toString().replace(/\/+$/, '');
}
