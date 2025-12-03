"use client";

import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";

export default function Home() {
  const [history, setHistory] = useState([]);
  const [collections, setCollections] = useState([]);
  const [newCollectionName, setNewCollectionName] = useState("");
  const [selectedCollection, setSelectedCollection] = useState(null);

  const [url, setUrl] = useState("");
  const [method, setMethod] = useState("GET");
  const [body, setBody] = useState("");
  const [headers, setHeaders] = useState("");
  const [response, setResponse] = useState(null);
  const [loading, setLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false); // mobile toggle

  // LOAD HISTORY
  async function loadHistory() {
    const { data } = await supabase
      .from("history")
      .select("*")
      .order("created_at", { ascending: false });
    setHistory(data || []);
  }

  // LOAD COLLECTIONS
  async function loadCollections() {
    const { data } = await supabase.from("collections").select("*");
    setCollections(data || []);
  }

  useEffect(() => {
    loadHistory();
    loadCollections();
  }, []);

  async function createCollection() {
    if (!newCollectionName.trim()) return;
    const { data } = await supabase
      .from("collections")
      .insert({ name: newCollectionName })
      .select();
    setNewCollectionName("");
    if (data) loadCollections();
  }

  async function saveToCollection() {
    if (!selectedCollection) return;
    await supabase.from("collection_items").insert({
      collection_id: selectedCollection,
      url,
      method,
      headers: headers ? JSON.parse(headers) : null,
      body: body ? JSON.parse(body) : null,
    });
  }

  async function deleteHistoryItem(id) {
    await supabase.from("history").delete().eq("id", id);
    loadHistory();
  }

  async function clearAllHistory() {
    await supabase.from("history").delete().neq("id", 0);
    loadHistory();
  }

  const copyJSON = () => {
    if (response?.body) navigator.clipboard.writeText(JSON.stringify(response.body, null, 2));
  };

  const copyCurl = () => {
    let curl = `curl -X ${method} "${url}"`;
    if (headers.trim()) {
      const h = JSON.parse(headers);
      Object.keys(h).forEach((k) => {
        curl += ` -H "${k}: ${h[k]}"`;
      });
    }
    if (body.trim() && method !== "GET") curl += ` -d '${body}'`;
    navigator.clipboard.writeText(curl);
  };

  const sendRequest = async () => {
    try {
      setLoading(true);
      const startTime = performance.now();
      let parsedHeaders = headers.trim() ? JSON.parse(headers) : {};
      const options = {
        method,
        headers: { "Content-Type": "application/json", ...parsedHeaders },
      };
      if (method !== "GET" && body.trim()) options.body = body;

      const res = await fetch(url, options);
      const timeTaken = (performance.now() - startTime).toFixed(1);

      let data;
      try {
        data = await res.json();
      } catch {
        data = await res.text();
      }

      const resultObj = {
        status: res.status,
        ok: res.ok,
        time: timeTaken,
        headers: Object.fromEntries(res.headers.entries()),
        body: data,
      };

      setResponse(resultObj);

      await supabase.from("history").insert({
        url,
        method,
        headers: parsedHeaders,
        body: body ? JSON.parse(body) : null,
        response: data,
      });

      loadHistory();
    } catch (err) {
      setResponse({ error: err.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-screen bg-gray-100 text-black overflow-hidden">

      {/* MOBILE SIDEBAR OVERLAY */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* SIDEBAR */}
      <div
        className={`fixed top-0 left-0 h-full w-72 bg-white border-r p-4 overflow-auto z-50 transform transition-transform duration-300 ease-in-out
          ${sidebarOpen ? "translate-x-0" : "-translate-x-full"} md:translate-x-0 md:static md:flex-shrink-0`}
      >
        <h2 className="text-xl font-bold mb-3">History</h2>

        {history.map((entry) => (
          <div key={entry.id} className="p-2 border rounded mb-2 bg-gray-50">
            <div
              className="cursor-pointer"
              onClick={() => {
                setUrl(entry.url);
                setMethod(entry.method);
                setBody(JSON.stringify(entry.body ?? {}, null, 2));
                setHeaders(JSON.stringify(entry.headers ?? {}, null, 2));
                setSidebarOpen(false); // auto close on mobile
              }}
            >
              <p className="font-bold">{entry.method}</p>
              <p className="text-xs text-gray-600 break-all">{entry.url}</p>
            </div>
            <button
              onClick={() => deleteHistoryItem(entry.id)}
              className="text-red-500 text-xs mt-1"
            >
              Delete
            </button>
          </div>
        ))}

        <button
          onClick={clearAllHistory}
          className="mt-4 w-full bg-red-500 text-white p-2 rounded text-sm"
        >
          Clear All History
        </button>

        <h2 className="text-xl font-bold mt-6 mb-3">Collections</h2>

        <div className="flex gap-2 mb-3 flex-col sm:flex-row">
          <input
            type="text"
            value={newCollectionName}
            onChange={(e) => setNewCollectionName(e.target.value)}
            placeholder="New collection"
            className="border p-2 flex-1 rounded"
          />
          <button
            onClick={createCollection}
            className="bg-black text-white px-3 rounded mt-2 sm:mt-0"
          >
            Add
          </button>
        </div>

        {collections.map((c) => (
          <div
            key={c.id}
            className={`p-2 border rounded mb-2 cursor-pointer ${selectedCollection === c.id ? "bg-gray-200" : "bg-gray-50"}`}
            onClick={() => setSelectedCollection(c.id)}
          >
            {c.name}
          </div>
        ))}

        {selectedCollection && (
          <button
            onClick={saveToCollection}
            className="w-full bg-blue-600 text-white p-2 rounded mt-2"
          >
            Save Request to Collection
          </button>
        )}
      </div>

      {/* MAIN PANEL */}
      <div className="flex-1 flex flex-col overflow-auto">
        {/* MOBILE TOGGLE BUTTON */}
        <div className="md:hidden p-2 bg-black text-white">
          <button onClick={() => setSidebarOpen(true)} className="w-full">Open Sidebar</button>
        </div>

        <div className="p-6 flex-1 overflow-auto">
          <h1 className="text-2xl font-bold mb-4">API TESTING TOOL</h1>

          <div className="flex gap-3 mb-4 flex-col md:flex-row">
            <select
              value={method}
              onChange={(e) => setMethod(e.target.value)}
              className="p-2 border rounded w-32 bg-white"
            >
              <option>GET</option>
              <option>POST</option>
              <option>PUT</option>
              <option>DELETE</option>
            </select>

            <input
              type="text"
              placeholder="Enter request URL"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="p-2 border flex-1 rounded"
            />
          </div>

          <div className="mb-4">
            <h3 className="font-semibold mb-1">Request Body (JSON)</h3>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              className="w-full p-3 border rounded h-32"
            />
          </div>

          <div className="mb-4">
            <h3 className="font-semibold mb-1">Headers (JSON)</h3>
            <textarea
              value={headers}
              onChange={(e) => setHeaders(e.target.value)}
              className="w-full p-3 border rounded h-28"
            />
          </div>

          <button
            onClick={sendRequest}
            disabled={loading}
            className="bg-black text-white font-semibold px-6 py-2 rounded"
          >
            {loading ? "Sending..." : "Send Request"}
          </button>

          {/* RESPONSE PANEL */}
          <div className="mt-6 bg-black text-green-400 p-6 rounded overflow-auto">
            <h2 className="text-xl font-bold text-white mb-2">Response</h2>

            {response && (
              <div className="flex gap-2 mb-3 flex-wrap">
                <button onClick={copyJSON} className="bg-gray-700 text-white px-3 py-1 rounded text-sm">Copy JSON</button>
                <button onClick={copyCurl} className="bg-gray-700 text-white px-3 py-1 rounded text-sm">Copy cURL</button>
              </div>
            )}

            {response && (
              <div className="flex gap-4 text-white mb-3 text-sm flex-wrap">
                <p>Status: <span className={response.ok ? "text-green-400" : "text-red-400"}> {response.status}</span></p>
                <p>Time: <span className="text-blue-400">{response.time} ms</span></p>
              </div>
            )}

            <div className="bg-black p-3 rounded text-green-400 text-sm overflow-auto">
              {response ? (
                <pre className="whitespace-pre-wrap">{JSON.stringify(response, null, 2)}</pre>
              ) : (
                <p>No response yet...</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
