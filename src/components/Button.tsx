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
    "text-sm py-2 px-2": props.xs,
    "text-base font-medium py-2 px-3": props.sm,
    "font-extrabold text-xl py-4 px-6": props.xl,
    "text-lg font-semibold py-2 px-4": !props.xl,
    "bg-white text-gray-700 border-gray-400 hover:bg-gray-100 active:bg-white": props.secondary,
    "text-white bg-primary-700 border-gray-100 hover:bg-primary-900 active:bg-primary-800": !props.secondary && !props.red && !props.green,
    "text-white bg-red-500 border-gray-100 hover:bg-red-600 active:bg-red-500": props.red,
    "text-white bg-green-600 border-gray-100 hover:bg-green-700 active:bg-green-600": props.green,
    "w-full": props.full,
  });

  return (
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    <div className={`inline-flex rounded-md border items-center justify-center ${btnClass}`}>
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
