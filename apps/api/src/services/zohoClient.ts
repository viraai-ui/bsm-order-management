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
  const activeStatuses = new Set(config.activeStatuses.map((status) => status.toLowerCase()));

  return {
    async fetchSalesOrders(): Promise<ZohoSalesOrder[]> {
      const accessToken = await refreshAccessToken(config, fetcher);
      const orders: ZohoSalesOrder[] = [];
      let page = 1;
      let hasMorePage = true;

      while (hasMorePage) {
        const response = await fetcher(buildSalesOrdersUrl(config, page), {
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
          orders.push(await fetchSalesOrderDetail(config, accessToken, order.salesorder_id, fetcher));
        }

        hasMorePage = payload.page_context?.has_more_page === true;
        page += 1;
      }

      return orders;
    }
  };
}

async function refreshAccessToken(config: ZohoConfig, fetcher: Fetcher): Promise<string> {
  const body = new URLSearchParams({
    refresh_token: config.refreshToken,
    client_id: config.clientId,
    client_secret: config.clientSecret,
    grant_type: 'refresh_token'
  });

  const response = await fetcher(buildZohoTokenUrl(config), {
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
  config: ZohoConfig,
  accessToken: string,
  salesOrderId: string,
  fetcher: Fetcher
): Promise<ZohoSalesOrder> {
  const response = await fetcher(buildSalesOrderDetailUrl(config, salesOrderId), {
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

function buildSalesOrdersUrl(config: ZohoConfig, page: number) {
  const url = new URL(`${config.apiBaseUrl}/salesorders`);
  url.searchParams.set('organization_id', config.organizationId);
  url.searchParams.set('page', String(page));
  url.searchParams.set('per_page', String(SALES_ORDER_PAGE_SIZE));
  return url.toString();
}

function buildSalesOrderDetailUrl(config: ZohoConfig, salesOrderId: string) {
  const url = new URL(`${config.apiBaseUrl}/salesorders/${salesOrderId}`);
  url.searchParams.set('organization_id', config.organizationId);
  return url.toString();
}

function buildZohoTokenUrl(config: ZohoConfig) {
  const apiHost = new URL(config.apiBaseUrl).hostname;

  if (apiHost.startsWith('www.zohoapis.')) {
    const domainSuffix = apiHost.slice('www.zohoapis.'.length);
    return `https://accounts.zoho.${domainSuffix}/oauth/v2/token`;
  }

  return 'https://accounts.zoho.com/oauth/v2/token';
}
