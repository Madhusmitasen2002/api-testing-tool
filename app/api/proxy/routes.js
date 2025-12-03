export async function POST(req) {
  try {
    const { url, method, headers, body } = await req.json();

    const response = await fetch(url, {
      method,
      headers,
      body: method !== "GET" ? JSON.stringify(body) : undefined,
    });

    const text = await response.text();

    return Response.json({
      ok: response.ok,
      status: response.status,
      headers: Object.fromEntries(response.headers.entries()),
      body: text,
    });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
