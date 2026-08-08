// SPDX-License-Identifier: AGPL-3.0-or-later
export interface NotFoundStrings {
  title: string;
  message: string;
}

interface NotFoundProps {
  strings: NotFoundStrings;
}

export default function NotFound({ strings }: NotFoundProps) {
  return (
    <div>
      <h1>{strings.title}</h1>
      <p>{strings.message}</p>
    </div>
  );
}
