import { ReactNode } from "react";

import "./FormElement.css";
import classNames from "classnames";

interface IFormElementProps {
  children: ReactNode;
  colSpanSize?: string;
  helper?: string;
}

/**
 * @component
 * @params props - Component props.
 * @param props.children - Children components.
 * @param props.colSpanSize - Tailwind CSS class to control how elements are sized in grid.
 * @param props.helper - Helper message for users on how fill the form element.
 */
const FormElement = (props: IFormElementProps) => {
  const inputClass = classNames("input", props.colSpanSize);

  return (
    <div className={inputClass}>
      {props.children}

      {props.helper && (
        <div className="mt-1 text-sm text-gray-500">{props.helper}</div>
      )}
    </div>
  );
};

export { FormElement };
