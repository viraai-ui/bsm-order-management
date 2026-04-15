import { createZohoClient } from '../src/services/zohoClient.js';
import type { ZohoSalesOrder } from '../src/lib/zoho.js';

type FetchCall = {
  input: RequestInfo | URL;
  init?: RequestInit;
};

describe('createZohoClient', () => {
  const config = {
    clientId: 'zoho-client-id',
    clientSecret: 'zoho-client-secret',
    refreshToken: 'zoho-refresh-token',
    organizationId: '1234567890',
    apiBaseUrl: 'https://www.zohoapis.com/inventory/v1',
    activeStatuses: ['confirmed', 'packed']
  };

  it('refreshes the access token, fetches all sales-order pages, loads details, and filters inactive statuses', async () => {
    const calls: FetchCall[] = [];
    const fetcher: typeof fetch = async (input, init) => {
      calls.push({ input, init });

      const url = String(input);

      if (url === 'https://accounts.zoho.com/oauth/v2/token') {
        return new Response(JSON.stringify({ access_token: 'fresh-access-token' }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      if (url === 'https://www.zohoapis.com/inventory/v1/salesorders?organization_id=1234567890&page=1&per_page=200') {
        return new Response(
          JSON.stringify({
            salesorders: [
              buildSalesOrderSummary({ salesorder_id: 'so-1', status: 'confirmed' }),
              buildSalesOrderSummary({ salesorder_id: 'so-2', status: 'delivered' })
            ],
            page_context: { has_more_page: true }
          }),
          {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
          }
        );
      }

      if (url === 'https://www.zohoapis.com/inventory/v1/salesorders?organization_id=1234567890&page=2&per_page=200') {
        return new Response(
          JSON.stringify({
            salesorders: [
              buildSalesOrderSummary({ salesorder_id: 'so-3', status: 'packed' }),
              buildSalesOrderSummary({ salesorder_id: 'so-4', status: 'cancelled' })
            ],
            page_context: { has_more_page: false }
          }),
          {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
          }
        );
      }

      if (url === 'https://www.zohoapis.com/inventory/v1/salesorders/so-1?organization_id=1234567890') {
        return new Response(JSON.stringify({ salesorder: buildSalesOrder({ salesorder_id: 'so-1', status: 'confirmed' }) }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      if (url === 'https://www.zohoapis.com/inventory/v1/salesorders/so-3?organization_id=1234567890') {
        return new Response(JSON.stringify({ salesorder: buildSalesOrder({ salesorder_id: 'so-3', status: 'packed' }) }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      throw new Error(`Unexpected fetch: ${url}`);
    };

    const client = createZohoClient(config, fetcher);

    await expect(client.fetchSalesOrders()).resolves.toEqual([
      buildSalesOrder({ salesorder_id: 'so-1', status: 'confirmed' }),
      buildSalesOrder({ salesorder_id: 'so-3', status: 'packed' })
    ]);

    expect(calls).toHaveLength(5);
    expect(String(calls[0]?.input)).toBe('https://accounts.zoho.com/oauth/v2/token');
    expect(calls[0]?.init?.method).toBe('POST');
    expect(calls[0]?.init?.headers).toEqual({ 'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8' });
    expect(calls[0]?.init?.body?.toString()).toBe(
      'refresh_token=zoho-refresh-token&client_id=zoho-client-id&client_secret=zoho-client-secret&grant_type=refresh_token'
    );

    expect(calls[1]?.init?.headers).toEqual({ Authorization: 'Zoho-oauthtoken fresh-access-token' });
    expect(calls[2]?.init?.headers).toEqual({ Authorization: 'Zoho-oauthtoken fresh-access-token' });
    expect(calls[3]?.init?.headers).toEqual({ Authorization: 'Zoho-oauthtoken fresh-access-token' });
    expect(calls[4]?.init?.headers).toEqual({ Authorization: 'Zoho-oauthtoken fresh-access-token' });
  });

  it('uses the matching accounts domain for India tenants', async () => {
    const calls: FetchCall[] = [];
    const fetcher: typeof fetch = async (input, init) => {
      calls.push({ input, init });

      const url = String(input);

      if (url === 'https://accounts.zoho.in/oauth/v2/token') {
        return new Response(JSON.stringify({ access_token: 'fresh-access-token' }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      if (url === 'https://www.zohoapis.in/inventory/v1/salesorders?organization_id=1234567890&page=1&per_page=200') {
        return new Response(JSON.stringify({ salesorders: [], page_context: { has_more_page: false } }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      throw new Error(`Unexpected fetch: ${url}`);
    };

    const client = createZohoClient(
      {
        ...config,
        apiBaseUrl: 'https://www.zohoapis.in/inventory/v1'
      },
      fetcher
    );

    await expect(client.fetchSalesOrders()).resolves.toEqual([]);
    expect(String(calls[0]?.input)).toBe('https://accounts.zoho.in/oauth/v2/token');
  });

  it('throws when the access token refresh fails', async () => {
    const fetcher: typeof fetch = async () =>
      new Response(JSON.stringify({ error: 'invalid_client' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });

    const client = createZohoClient(config, fetcher);

    await expect(client.fetchSalesOrders()).rejects.toThrow(/failed to refresh zoho access token/i);
  });
});

function buildSalesOrder(overrides: Partial<ZohoSalesOrder>): ZohoSalesOrder {
  return {
    salesorder_id: 'so-default',
    salesorder_number: 'SO-0001',
    date: '2026-04-13',
    delivery_date: '2026-04-20',
    customer_name: 'BSM Customer',
    status: 'confirmed',
    line_items: [
      {
        line_item_id: 'line-1',
        name: 'Axial Fan Unit',
        quantity: 2,
        sku: 'AFU-2',
        image_url: 'https://example.com/afu.png'
      }
    ],
    ...overrides
  };
}

function buildSalesOrderSummary(overrides: Partial<ZohoSalesOrder>): ZohoSalesOrder {
  return {
    salesorder_id: 'so-default',
    salesorder_number: 'SO-0001',
    date: '2026-04-13',
    delivery_date: '2026-04-20',
    customer_name: 'BSM Customer',
    status: 'confirmed',
    ...overrides
  } as ZohoSalesOrder;
}
