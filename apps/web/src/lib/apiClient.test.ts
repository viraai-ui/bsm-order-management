import { dashboardSnapshot, groupOrdersByBucket } from './apiClient';

describe('groupOrdersByBucket', () => {
  it('groups dashboard snapshot into the 4 dispatch buckets', () => {
    const grouped = groupOrdersByBucket(dashboardSnapshot);

    expect(grouped.Urgent).toHaveLength(1);
    expect(grouped.Today).toHaveLength(1);
    expect(grouped.Tomorrow).toHaveLength(1);
    expect(grouped.Later).toHaveLength(1);
    expect(grouped.Urgent[0]?.id).toBe('BSM-24018');
  });
});
