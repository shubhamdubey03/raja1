declare module '*.png';
declare module '*.jpg';
declare module '*.jpeg';
declare module '*.svg';

declare module 'react-native-razorpay' {
  interface Prefill {
    contact?: string;
    name?: string;
    email?: string;
  }

  interface Theme {
    color?: string;
  }

  interface CheckoutOptions {
    description: string;
    image: string;
    currency: string;
    key: string;
    amount: number;
    name: string;
    order_id: string;
    prefill?: Prefill;
    theme?: Theme;
  }

  interface CheckoutResponse {
    razorpay_payment_id: string;
    razorpay_order_id: string;
    razorpay_signature: string;
  }

  export default class RazorpayCheckout {
    static open(options: CheckoutOptions): Promise<CheckoutResponse>;
  }
}
