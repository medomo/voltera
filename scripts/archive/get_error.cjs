const puppeteer = require('puppeteer');
(async () => {
  const browser = await puppeteer.launch({ args: ['--no-sandbox'] });
  const page = await browser.newPage();
  
  page.on('pageerror', err => {
    console.log('PAGE_ERROR:', err.toString());
  });

  await page.goto('http://localhost:3000');
  await new Promise(r => setTimeout(r, 1000));
  
  await page.evaluate(() => {
    Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('admin'))?.click();
  });
  
  await new Promise(r => setTimeout(r, 500));
  
  await page.evaluate(() => {
    Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('تسجيل الدخول الآمن'))?.click();
  });

  await new Promise(r => setTimeout(r, 2000));

  await page.evaluate(() => {
    const btn = Array.from(document.querySelectorAll('button span')).find(s => s.textContent.includes('إعدادات النظام'));
    if (btn) btn.click();
  });

  await new Promise(r => setTimeout(r, 2000));
  const html = await page.evaluate(() => document.body.innerHTML);
  if (html.includes('Something went wrong')) {
    console.log("CRASH ON SYSTEM!");
    console.log(html);
  } else {
    console.log("System OK.");
  }

  await browser.close();
})();
