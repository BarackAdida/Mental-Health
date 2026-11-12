const { versions } = require('../partner');

const counselingListing = {
  id: 17,
  title: 'Counseling Session',
  description: 'One-on-one support',
  price: 1500,
  status: 'available',
  providerName: 'Dr. Wanjiku',
  internalField: 'must not be forwarded',
};

describe('StrathShop response adapters', () => {
  test('v1 array responses are mapped to the fields used by our page', () => {
    expect(versions.v1.parse([counselingListing])).toEqual([{
      id: 17,
      title: 'Counseling Session',
      description: 'One-on-one support',
      price: 1500,
      status: 'available',
      providerName: 'Dr. Wanjiku',
    }]);
  });

  test('v1 rejects a response that is not an array', () => {
    expect(() => versions.v1.parse({ data: [counselingListing] }))
      .toThrow('unexpected v1 shape');
  });

  test('v2 data responses are mapped to the fields used by our page', () => {
    expect(versions.v2.parse({ data: [counselingListing] })).toEqual([{
      id: 17,
      title: 'Counseling Session',
      description: 'One-on-one support',
      price: 1500,
      status: 'available',
      providerName: 'Dr. Wanjiku',
    }]);
  });

  test('v2 rejects a response without a data array', () => {
    expect(() => versions.v2.parse([counselingListing]))
      .toThrow('unexpected v2 shape');
  });
});
