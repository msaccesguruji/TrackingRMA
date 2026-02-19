import puppeteer from 'puppeteer';
import { NextResponse } from 'next/server';

type LoginRequest = {
  email?: string;
  password?: string;
  langCode?: string;
  initialCookies?: string;
};

type SerializableCookie = {
  name: string;
  value: string;
  domain?: string;
  path?: string;
  expires?: number;
  httpOnly?: boolean;
  secure?: boolean;
  sameSite?: 'Strict' | 'Lax' | 'None';
};

const APP_SQUARE_BASE_URL = 'https://app.squareup.com';
const DEFAULT_LANG_CODE = 'en-us';

function parseCookieHeader(cookieHeader: string): SerializableCookie[] {
  return cookieHeader
    .split(';')
    .map((item) => item.trim())
    .filter(Boolean)
    .map((pair) => {
      const separatorIndex = pair.indexOf('=');
      if (separatorIndex <= 0) {
        return null;
      }

      const name = pair.slice(0, separatorIndex).trim();
      const value = pair.slice(separatorIndex + 1).trim();

      if (!name) {
        return null;
      }

      return {
        name,
        value,
        domain: '.squareup.com',
        path: '/',
        secure: true,
      } as SerializableCookie;
    })
    .filter((cookie): cookie is SerializableCookie => cookie !== null);
}

async function typeIntoFirstMatchingSelector(
  page: puppeteer.Page,
  selectors: string[],
  value: string,
): Promise<string> {
  for (const selector of selectors) {
    const field = await page.$(selector);
    if (field) {
      await field.click({ clickCount: 3 });
      await field.press('Backspace');
      await field.type(value, { delay: 50 });
      return selector;
    }
  }

  throw new Error(`Unable to find any matching selector: ${selectors.join(', ')}`);
}

async function clickFirstMatchingSelector(
  page: puppeteer.Page,
  selectors: string[],
): Promise<string> {
  for (const selector of selectors) {
    const button = await page.$(selector);
    if (button) {
      await button.click();
      return selector;
    }
  }

  throw new Error(`Unable to find any clickable selector: ${selectors.join(', ')}`);
}

export async function POST(request: Request) {
  let browser: puppeteer.Browser | undefined;

  try {
    const { email, password, langCode, initialCookies } =
      (await request.json()) as LoginRequest;

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Both email and password are required.' },
        { status: 400 },
      );
    }

    const resolvedLangCode = langCode || DEFAULT_LANG_CODE;
    const loginUrl = `${APP_SQUARE_BASE_URL}/login?lang_code=${encodeURIComponent(resolvedLangCode)}`;

    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

    const page = await browser.newPage();
    await page.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36',
    );
    await page.setExtraHTTPHeaders({
      'accept-language': 'en-US,en;q=0.9',
      'cache-control': 'no-cache',
      pragma: 'no-cache',
      'upgrade-insecure-requests': '1',
      referer: 'https://squareup.com/',
    });

    if (initialCookies) {
      const parsedCookies = parseCookieHeader(initialCookies);
      if (parsedCookies.length > 0) {
        await page.setCookie(...parsedCookies);
      }
    }

    await page.goto(loginUrl, { waitUntil: 'networkidle2', timeout: 45_000 });

    await page.waitForSelector('input[type="email"], input[name="email"]', {
      timeout: 30_000,
    });

    const emailSelectorUsed = await typeIntoFirstMatchingSelector(
      page,
      ['input[type="email"]', 'input[name="email"]', 'input[data-testid="email-input"]'],
      email,
    );

    const continueSelectorUsed = await clickFirstMatchingSelector(page, [
      'button[data-testid="continue-button"]',
      'button[type="submit"]',
    ]);

    await page.waitForSelector('input[type="password"], input[name="password"]', {
      timeout: 30_000,
    });

    const passwordSelectorUsed = await typeIntoFirstMatchingSelector(
      page,
      [
        'input[type="password"]',
        'input[name="password"]',
        'input[data-testid="password-input"]',
      ],
      password,
    );

    const signInSelectorUsed = await clickFirstMatchingSelector(page, [
      'button[data-testid="signin-button"]',
      'button[type="submit"]',
    ]);

    await page
      .waitForNavigation({ waitUntil: 'networkidle2', timeout: 30_000 })
      .catch(() => null);

    const cookies = await page.cookies();

    return NextResponse.json({
      success: true,
      loginUrl,
      selectorsUsed: {
        email: emailSelectorUsed,
        continueButton: continueSelectorUsed,
        password: passwordSelectorUsed,
        signInButton: signInSelectorUsed,
      },
      cookieCount: cookies.length,
      cookies,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected error';
    return NextResponse.json(
      { success: false, error: 'Square login automation failed.', details: message },
      { status: 500 },
    );
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}
