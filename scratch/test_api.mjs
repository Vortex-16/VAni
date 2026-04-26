const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

async function runTest() {
  const url = "http://localhost:3000/api/discharge/dev";
  console.log(`Hitting ${url}...`);
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ data: { medicines: [] } })
    });
    const body = await res.json();
    console.log("Response:", body);
  } catch (err) {
    console.error("Fetch failed:", err);
  }
}

runTest();
