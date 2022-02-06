var __defProp = Object.defineProperty;
var __markAsModule = (target) => __defProp(target, "__esModule", { value: true });
var __export = (target, all) => {
  __markAsModule(target);
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// functions/get-products.ts
__export(exports, {
  handler: () => handler
});

// functions/data/products.json
var products_default = [
  {
    sku: "DEMO001",
    name: "This Pretty Plant",
    description: "Look at this pretty plant. Photo by Galina N on Unsplash.",
    image: "https://images.unsplash.com/photo-1485955900006-10f4d324d411?auto=format&fit=crop&w=600&h=600&q=80",
    amount: 300,
    currency: "SEK"
  },
  {
    sku: "DEMO002",
    name: "Adventure Mug",
    description: "We\u2019re going on an adventure! Photo by Annie Spratt on Unsplash.",
    image: "https://images.unsplash.com/photo-1454329001438-1752daa90420?auto=format&fit=crop&w=600&h=600&q=80",
    amount: 350,
    currency: "SEK"
  }
];

// functions/get-products.ts
var handler = async (event, context) => {
  return {
    statusCode: 200,
    body: JSON.stringify(products_default)
  };
};
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  handler
});
//# sourceMappingURL=get-products.js.map
