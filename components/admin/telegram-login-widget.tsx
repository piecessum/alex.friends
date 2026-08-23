"use client";

import * as React from "react";

// Виджет сам вставляет себе <iframe> рядом со <script>-тегом после загрузки.
// Если рендерить <script> прямо в JSX серверного компонента, React при
// гидратации не знает об этом сайд-эффекте и вычищает вставленное — кнопка
// пропадает. Вставляем скрипт императивно через ref, в обход React, чтобы
// он не трогал этот узел вообще.
export function TelegramLoginWidget({ botUsername }: { botUsername: string }) {
  const ref = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!ref.current) return;
    const script = document.createElement("script");
    script.src = "https://telegram.org/js/telegram-widget.js?22";
    script.async = true;
    script.setAttribute("data-telegram-login", botUsername);
    script.setAttribute("data-size", "large");
    script.setAttribute("data-auth-url", "/api/auth/telegram-callback");
    script.setAttribute("data-request-access", "write");
    ref.current.appendChild(script);
  }, [botUsername]);

  return <div ref={ref} />;
}
