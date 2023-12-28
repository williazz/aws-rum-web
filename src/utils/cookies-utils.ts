import { CookieAttributes } from '../orchestration/Orchestration';

const buildCookie = (
    name: string,
    value: string,
    attributes: CookieAttributes,
    ttl?: number,
    expires?: Date
): string => {
    const cookie = [`${name}=${value}`];
    if (expires !== undefined) {
        cookie.push(`Expires=${expires.toUTCString()}`);
    } else if (ttl !== undefined) {
        cookie.push(`Expires=${getExpiryDate(ttl).toUTCString()}`);
    }
    cookie.push(`Domain=${attributes.domain}`);
    cookie.push(`Path=${attributes.path}`);
    cookie.push(`SameSite=${attributes.sameSite}`);
    if (attributes.secure) {
        cookie.push('Secure');
    }
    return cookie.join('; ');
};

/**
 * Stores a cookie.
 *
 * @param name The cookie's name.
 * @param value The cookie's value.
 * @param attributes The domain where the cookie will be stored.
 * @param ttl Time to live -- expiry date is current date + ttl (do not use with {@code expires}).
 * @param expires The expiry date for the cookie (do not use with {@code ttl})
 */
export const storeCookie = (
    name: string,
    value: string,
    attributes: CookieAttributes,
    ttl?: number,
    expires?: Date
) => {
    document.cookie = buildCookie(name, value, attributes, ttl, expires);
};

/**
 * Returns the current date + TTL
 *
 * @param ttl seconds to live
 */
export const getExpiryDate = (ttl: number): Date => {
    return new Date(new Date().getTime() + ttl * 1000);
};

/**
 * Removes a cookie by setting its expiry in the past.
 *
 * @param name The cookie's name.
 */
export const removeCookie = (name: string, attributes: CookieAttributes) => {
    document.cookie = buildCookie(name, '', attributes, 0);
};

/**
 * Get a cookie with a given name
 *
 * @param name The cookie's name.
 */
export const getCookie = (name: string): string => {
    const cookies = document.cookie.split('; ');
    for (const cookie of cookies) {
        const split = cookie.split('=');
        if (split[0] === name) {
            return split[1];
        }
    }
    return '';
};
