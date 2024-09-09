import "./Button.module.css";
import { ReactNode } from "react";

import classNames from "classnames";

interface IButtonProps {
  loading?: boolean;
  xs?: boolean;
  sm?: boolean;
  xl?: boolean;
  secondary?: boolean;
  red?: boolean;
  green?: boolean;
  full?: boolean;
  children: ReactNode;
}

/**
 * @component
 * @params props - Component props.
 * @param props.loading - Display loading indicator.
 * @param props.xs - Button in xs size.
 * @param props.sm - Button in sm size.
 * @param props.xl - Button in xl size.
 * @param props.secondary - Indicates if the button is a secondary button.
 * @param props.red - Indicates if the button is a red button.
 * @param props.green - Indicates if the button is a green button.
 * @param props.full - Indicates if the button takes 100% width.
 * @param props.children - Children components.
 */
const Button = (props: IButtonProps) => {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call
  const btnClass = classNames({
    btn: true,
    "btn-xs": props.xs,
    "btn-sm": props.sm,
    "btn-xl": props.xl,
    "btn-base": !props.xl,
    "btn-secondary": props.secondary,
    "btn-primary": !props.secondary,
    "btn-red": props.red,
    "btn-green": props.green,
    "w-full": props.full,
  });

  return (
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    <div className={btnClass}>
      {props.loading && (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="animate-spin h-5 w-5 text-white mr-1"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle cx="12" cy="12" r="10" stroke="currentColor" />
          <path
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
      )}

      {props.children}
    </div>
  );
};

export { Button };
