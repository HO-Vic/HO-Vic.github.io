/*
 * 글쓰기 버튼 런처.
 *
 * 모든 페이지의 <head>에서 defer로 로드된다. 발행 토큰이 이 브라우저에
 * 저장돼 있을 때만 버튼을 만들므로, 다른 사람에게는 아무것도 보이지 않는다.
 * (토큰이 없으면 발행도 불가능하니, 버튼을 보여줄 이유도 없다.)
 *
 * 위치는 테마의 #back-to-top 버튼 바로 위에 쌓이도록 같은 right 오프셋과
 * 미디어 쿼리를 사용한다. 테마 쪽 값이 바뀌면 여기도 같이 맞춰야 한다.
 */
(function () {
  'use strict';

  var TOKEN_KEY = 'cw.token';
  var WRITE_PATH = '/write/';

  function hasToken() {
    try {
      return !!localStorage.getItem(TOKEN_KEY);
    } catch (e) {
      return false;
    }
  }

  /* 이미 에디터에 있으면 띄우지 않는다. */
  function onWritePage() {
    return location.pathname.replace(/\/+$/, '') === WRITE_PATH.replace(/\/+$/, '');
  }

  if (!hasToken() || onWritePage()) return;

  var css = [
    '#cw-launcher{',
    'position:fixed;right:1rem;bottom:7.975rem;z-index:1;',
    'width:2.75rem;height:2.75rem;border-radius:50%;',
    'display:flex;align-items:center;justify-content:center;',
    'background:var(--button-bg);color:var(--btn-backtotop-color);',
    'border:1px solid var(--btn-backtotop-border-color,var(--main-border-color));',
    'box-shadow:0 0 8px 0 rgba(0,0,0,.08);',
    'text-decoration:none;cursor:pointer;',
    'transition:transform .2s ease-out;',
    '}',
    '#cw-launcher:hover{transform:translate3d(0,-5px,0);color:var(--link-color)}',
    '#cw-launcher i{font-size:1rem;line-height:1}',
    '@media all and (min-width:850px){#cw-launcher{right:5%;bottom:6.975rem}}',
    '@media all and (min-width:1400px){#cw-launcher{right:calc((100vw - 260px - 1140px)/2 + 3rem)}}',
    '@media all and (min-width:1650px){#cw-launcher{right:calc((100vw - 300px - 1250px)/2 + 2rem)}}'
  ].join('');

  var style = document.createElement('style');
  style.textContent = css;
  document.head.appendChild(style);

  var link = document.createElement('a');
  link.id = 'cw-launcher';
  link.href = WRITE_PATH;
  link.title = '글쓰기';
  link.setAttribute('aria-label', '글쓰기');
  link.innerHTML = '<i class="fas fa-pen" aria-hidden="true"></i>';

  document.body.appendChild(link);
})();
