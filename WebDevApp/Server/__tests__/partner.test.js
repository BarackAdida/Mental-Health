const { versions } = require('../partner');

const v1Body = [
  { id: 17, title: 'Counseling', description: 'Desc', price: 1500, status: 'available', providerName: 'Dr. Wanjiku' }
];

const v2Body = {
  data: [
    { id: 17, title: 'Counseling', description: 'Desc', price: 1500, status: 'available', providerName: 'Dr. Wanjiku' }
  ],
  count: 1
};

const wanted = [
  { id: 17, title: 'Counseling', description: 'Desc', price: 1500, status: 'available', providerName: 'Dr. Wanjiku' }
];

describe('Partner API Versioning Adapters', () => {
  test('v1 and v2 give the page exactly the same thing', () => {
    expect(versions.v1.parse(v1Body)).toEqual(wanted);
    expect(versions.v2.parse(v2Body)).toEqual(wanted);
  });

  test('the wrong parser fails loudly, not quietly', () => {
    expect(() => versions.v1.parse(v2Body)).toThrow();
  });
});