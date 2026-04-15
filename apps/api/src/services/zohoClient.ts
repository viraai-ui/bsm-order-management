import type { ApiConfig } from '../lib/env.js';
import type { ZohoSalesOrder } from '../lib/zoho.js';

const ZOHO_TOKEN_URL = 'https://accounts.zoho.com/oauth/v2/token';
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

        orders.push(
          ...(payload.salesorders ?? []).filter((order) => activeStatuses.has(order.status.toLowerCase()))
        );
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

  const response = await fetcher(ZOHO_TOKEN_URL, {
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

function buildSalesOrdersUrl(config: ZohoConfig, page: number) {
  const url = new URL(`${config.apiBaseUrl}/salesorders`);
  url.searchParams.set('organization_id', config.organizationId);
  url.searchParams.set('page', String(page));
  url.searchParams.set('per_page', String(SALES_ORDER_PAGE_SIZE));
  return url.toString();
}
