const versions = {
  v1: {
    path: '/listings?category=counseling',
    parse: (body) => {
      if (!Array.isArray(body)) throw new Error('unexpected v1 shape');
      return body.map(l => ({
        id: l.id, title: l.title, description: l.description, price: l.price, status: l.status, providerName: l.providerName
      }));
    }
  },
  v2: {
    path: '/v2/listings?category=counseling',
    parse: (body) => {
      if (!Array.isArray(body.data)) throw new Error('unexpected v2 shape');
      return body.data.map(l => ({
        id: l.id, title: l.title, description: l.description, price: l.price, status: l.status, providerName: l.providerName
      }));
    }
  }
};

module.exports = { versions };