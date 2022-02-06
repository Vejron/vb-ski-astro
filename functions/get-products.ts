import { Handler } from '@netlify/functions'
import products from './data/products.json';

const handler: Handler = async (event, context) => {
  return {
    statusCode: 200,
    body: JSON.stringify(products),
  };
}

export { handler }