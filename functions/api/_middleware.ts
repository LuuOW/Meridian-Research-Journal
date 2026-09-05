export const onRequest = async (context: {
  request: Request;
  next: () => Promise<Response>;
}) => {
  const { request, next } = context;

  if (request.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, X-Deletion-Password, Authorization, X-Requested-With",
      },
    });
  }

  const response = await next();
  const headers = new Headers(response.headers);
  headers.set("Access-Control-Allow-Origin", "*");
  headers.set(
    "Access-Control-Allow-Headers",
    "Content-Type, X-Deletion-Password, Authorization, X-Requested-With"
  );
  headers.set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
};
