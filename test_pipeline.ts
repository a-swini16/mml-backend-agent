import { Pipeline } from './src/pipeline';

async function test() {
  console.log("=== Testing Greeting & Name ===");
  const res1 = await Pipeline.process({
    message: 'hi, my name is ashuu',
    sessionId: 'test-1'
  }, (event, data) => {
    console.log(`[Stream ${event}]`, data);
  });
  console.log("Response:", res1.message, "\n");

  console.log("=== Testing Diagnostic Intent ===");
  const res2 = await Pipeline.process({
    message: 'i cant book any service',
    sessionId: 'test-2'
  }, (event, data) => {
    console.log(`[Stream ${event}]`, data);
  });
  console.log("Response:", res2.message, "\n");

  console.log("=== Testing Web Scraper Fallback (Coupons) ===");
  const res3 = await Pipeline.process({
    message: 'what coupons do you have?',
    sessionId: 'test-3'
  }, (event, data) => {
    console.log(`[Stream ${event}]`, data);
  });
  console.log("Response:", res3.message, "\n");

  console.log("=== Testing Postgres Exact Match (Count) ===");
  const res4 = await Pipeline.process({
    message: 'how many salons are in bhubaneswar?',
    sessionId: 'test-4'
  }, (event, data) => {
    console.log(`[Stream ${event}]`, data);
  });
  console.log("Response:", res4.message, "\n");

  process.exit(0);
}

test().catch(err => {
  console.error(err);
  process.exit(1);
});
