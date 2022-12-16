import * as React from "react";
import { themeChange } from "theme-change";
import {
  ArrowPathIcon,
  Bars3Icon,
  CheckCircleIcon,
  MoonIcon,
  SunIcon,
} from "@heroicons/react/24/outline";

import tailwindConfig from "../tailwind.config";

const {
  daisyui: { themes },
} = tailwindConfig;

const Navbar = React.forwardRef<HTMLDivElement, NavbarProps>(
  ({ children, loading, env, ...props }, ref) => {
    const [themeDark, setThemeDark] = React.useState<boolean>(false);

    React.useEffect(() => {
      themeChange(false);
    }, []);

    React.useEffect(() => {
      setThemeDark(localStorage.getItem("theme") === "dark");
    }, [themeDark]);

    // [Close the dropdown menu upon menu item click](https://github.com/saadeghi/daisyui/issues/157#issuecomment-1119796119)
    const closeMenu = () => {
      if (document.activeElement instanceof HTMLElement) {
        document.activeElement.blur();
      }
    };

    return (
      <div ref={ref} {...props} className="navbar bg-base-100">
        <div className="navbar-start">
          <div className="dropdown">
            <label tabIndex={0} className="btn-ghost btn-circle btn">
              <Bars3Icon className="h-6 w-6" strokeWidth="2" />
            </label>
            <ul
              tabIndex={0}
              className="dropdown-content menu rounded-box menu-compact mt-3 w-52 bg-base-200 p-2 shadow"
            >
              <li className="menu-title" onClick={closeMenu}>
                <span>Settings</span>
              </li>
              <li className="hover-bordered ml-2">
                <label tabIndex={0}>Theme</label>
                <ul className="rounded-box bg-base-300 p-2">
                  {themes.map((theme: string) => (
                    <li key={theme}>
                      <span data-set-theme={theme}>{theme}</span>
                    </li>
                  ))}
                </ul>
              </li>
            </ul>
          </div>
          <div className="tooltip tooltip-bottom" data-tip="theme toggle">
            <button
              className={`swap btn-ghost swap-rotate btn-circle btn ${
                themeDark ? "swap-active" : ""
              }`}
              onClick={() => setThemeDark(!themeDark)}
            >
              <div className="swap-on" data-set-theme="dark">
                <SunIcon className="h-6 w-6" strokeWidth="2" />
              </div>
              <div className="swap-off" data-set-theme="light">
                <MoonIcon className="h-6 w-6" strokeWidth="2" />
              </div>
            </button>
          </div>
        </div>
        <div className="navbar-center">
          <div className="text-xl font-bold normal-case">zkBioAuth</div>
        </div>
        <div className="navbar-end">
          {loading ? (
            <button className="btn-ghost btn-circle btn animate-spin">
              <ArrowPathIcon className="h-6 w-6" strokeWidth="2" />
            </button>
          ) : (
            <button className="btn-ghost btn-circle btn">
              <CheckCircleIcon
                className="h-6 w-6 text-success"
                strokeWidth="2"
              />
            </button>
          )}
        </div>
      </div>
    );
  }
);

Navbar.displayName = "Navbar";

interface NavbarProps extends React.ComponentPropsWithRef<"div"> {
  loading?: boolean;
  env?: "development" | "production" | "test" | undefined;
}

export type { NavbarProps };
export { Navbar };
