import { useEffect } from "react";
import Cookies from 'js-cookie';

export function LoginWithSuccessPage() {

  useEffect(() => {
    const token = Cookies.get('auth_token');

    if (token) {
      localStorage.setItem('token', token);
      Cookies.remove('auth_token');

      window.location.replace('/');
    } else {
      window.location.replace('/');
    }
  }, []);

  return null;
}
