/*
 * 블로그 내 글쓰기 에디터.
 *
 * 서버가 없으므로 발행은 브라우저에서 GitHub Contents API를 직접 호출해
 * _posts 에 마크다운 파일을 커밋하는 방식으로 동작한다. 권한 검사는 GitHub가
 * 토큰으로 수행하므로, 이 파일이 공개되어도 토큰 없이는 아무것도 쓸 수 없다.
 */
(function () {
  'use strict';

  var root = document.getElementById('composer');
  if (!root) return;

  var REPO = root.dataset.repo;
  var BRANCH = root.dataset.branch;
  var POSTS_DIR = root.dataset.postsDir;
  var IMG_DIR = root.dataset.imgDir;
  var API = 'https://api.github.com';

  var TOKEN_KEY = 'cw.token';
  var DRAFT_KEY = 'cw.draft';

  var el = {
    token: document.getElementById('cw-token'),
    tokenCheck: document.getElementById('cw-token-check'),
    tokenRemember: document.getElementById('cw-token-remember'),
    tokenClear: document.getElementById('cw-token-clear'),
    authStatus: document.getElementById('cw-auth-status'),
    title: document.getElementById('cw-title'),
    slug: document.getElementById('cw-slug'),
    filenamePreview: document.getElementById('cw-filename-preview'),
    desc: document.getElementById('cw-desc'),
    date: document.getElementById('cw-date'),
    cat: document.getElementById('cw-cat'),
    tags: document.getElementById('cw-tags'),
    pin: document.getElementById('cw-pin'),
    math: document.getElementById('cw-math'),
    mermaid: document.getElementById('cw-mermaid'),
    comments: document.getElementById('cw-comments'),
    body: document.getElementById('cw-body'),
    preview: document.getElementById('cw-preview'),
    previewToggle: document.getElementById('cw-preview-toggle'),
    imgBtn: document.getElementById('cw-img-btn'),
    imgInput: document.getElementById('cw-img-input'),
    message: document.getElementById('cw-message'),
    publish: document.getElementById('cw-publish'),
    draftClear: document.getElementById('cw-draft-clear'),
    draftStatus: document.getElementById('cw-draft-status'),
    result: document.getElementById('cw-result')
  };

  /* ── 저장소 접근 (localStorage가 막힌 환경에서도 죽지 않게) ───────────── */

  function store(key, value) {
    try {
      if (value === null) localStorage.removeItem(key);
      else localStorage.setItem(key, value);
    } catch (e) {
      /* 시크릿 모드 등 */
    }
  }

  function read(key) {
    try {
      return localStorage.getItem(key);
    } catch (e) {
      return null;
    }
  }

  /* ── 인코딩 유틸 ──────────────────────────────────────────────────────── */

  function bytesToBase64(bytes) {
    var chunk = 0x8000;
    var parts = [];
    for (var i = 0; i < bytes.length; i += chunk) {
      parts.push(String.fromCharCode.apply(null, bytes.subarray(i, i + chunk)));
    }
    return btoa(parts.join(''));
  }

  function textToBase64(text) {
    return bytesToBase64(new TextEncoder().encode(text));
  }

  /* ── 날짜 ────────────────────────────────────────────────────────────── */

  function pad(n) {
    return String(n).padStart(2, '0');
  }

  function localInputValue(d) {
    return (
      d.getFullYear() +
      '-' +
      pad(d.getMonth() + 1) +
      '-' +
      pad(d.getDate()) +
      'T' +
      pad(d.getHours()) +
      ':' +
      pad(d.getMinutes())
    );
  }

  /** 'Asia/Seoul' 같은 고정 오프셋이 아니라 브라우저 실제 오프셋을 쓴다. */
  function tzOffset(d) {
    var mins = -d.getTimezoneOffset();
    var sign = mins >= 0 ? '+' : '-';
    var abs = Math.abs(mins);
    return sign + pad(Math.floor(abs / 60)) + pad(abs % 60);
  }

  function parseDateInput() {
    var v = el.date.value;
    var d = v ? new Date(v) : new Date();
    if (isNaN(d.getTime())) d = new Date();
    return d;
  }

  function frontMatterDate(d) {
    return (
      d.getFullYear() +
      '-' +
      pad(d.getMonth() + 1) +
      '-' +
      pad(d.getDate()) +
      ' ' +
      pad(d.getHours()) +
      ':' +
      pad(d.getMinutes()) +
      ':' +
      pad(d.getSeconds()) +
      ' ' +
      tzOffset(d)
    );
  }

  function datePrefix(d) {
    return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  }

  /* ── 슬러그 / 머리말 ─────────────────────────────────────────────────── */

  function slugify(title) {
    var s = title
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9가-힣\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
    return s;
  }

  /** YAML 값은 항상 따옴표로 감싼다. 제목에 콜론이나 # 가 들어가도 깨지지 않게. */
  function yaml(value) {
    return '"' + String(value).replace(/\\/g, '\\\\').replace(/"/g, '\\"') + '"';
  }

  function splitList(raw, limit) {
    var items = raw
      .split(',')
      .map(function (s) {
        return s.trim();
      })
      .filter(Boolean);
    return limit ? items.slice(0, limit) : items;
  }

  function yamlList(items) {
    return (
      '[' +
      items
        .map(function (i) {
          return yaml(i);
        })
        .join(', ') +
      ']'
    );
  }

  function buildMarkdown() {
    var d = parseDateInput();
    var lines = ['---'];

    lines.push('title: ' + yaml(el.title.value.trim()));
    if (el.desc.value.trim()) lines.push('description: ' + yaml(el.desc.value.trim()));
    lines.push('date: ' + frontMatterDate(d));

    var cats = splitList(el.cat.value, 2);
    if (cats.length) lines.push('categories: ' + yamlList(cats));

    var tags = splitList(el.tags.value);
    if (tags.length) lines.push('tags: ' + yamlList(tags));

    if (el.pin.checked) lines.push('pin: true');
    if (el.math.checked) lines.push('math: true');
    if (el.mermaid.checked) lines.push('mermaid: true');
    if (!el.comments.checked) lines.push('comments: false');

    lines.push('---');
    lines.push('');
    lines.push(el.body.value.replace(/\s+$/, ''));
    lines.push('');

    return lines.join('\n');
  }

  function postPath() {
    return POSTS_DIR + '/' + datePrefix(parseDateInput()) + '-' + el.slug.value.trim() + '.md';
  }

  /* ── GitHub API ──────────────────────────────────────────────────────── */

  function token() {
    return el.token.value.trim();
  }

  function api(path, options) {
    options = options || {};
    var headers = {
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28'
    };
    if (token()) headers.Authorization = 'Bearer ' + token();
    if (options.body) headers['Content-Type'] = 'application/json';

    return fetch(API + path, {
      method: options.method || 'GET',
      headers: headers,
      body: options.body ? JSON.stringify(options.body) : undefined
    }).then(function (res) {
      return res
        .json()
        .catch(function () {
          return {};
        })
        .then(function (data) {
          return { ok: res.ok, status: res.status, data: data };
        });
    });
  }

  function setAuthStatus(text, kind) {
    el.authStatus.textContent = text;
    el.authStatus.className = 'cw-status' + (kind ? ' ' + kind : '');
  }

  function checkToken() {
    if (!token()) {
      setAuthStatus('토큰을 입력하세요', 'bad');
      return;
    }
    setAuthStatus('확인 중…');

    api('/user').then(function (user) {
      if (!user.ok) {
        setAuthStatus('토큰이 유효하지 않음 (' + user.status + ')', 'bad');
        return;
      }
      /* 레포에 실제로 쓸 수 있는지까지 확인한다. */
      api('/repos/' + REPO).then(function (repo) {
        if (!repo.ok) {
          setAuthStatus(user.data.login + ' · 레포 접근 불가', 'bad');
          return;
        }
        var canWrite = repo.data.permissions && repo.data.permissions.push;
        if (canWrite) {
          setAuthStatus(user.data.login + ' · 쓰기 권한 확인됨', 'ok');
          if (el.tokenRemember.checked) store(TOKEN_KEY, token());
        } else {
          setAuthStatus(user.data.login + ' · 쓰기 권한 없음 (Contents: write 필요)', 'bad');
        }
      });
    });
  }

  /** 이미 있는 파일이면 덮어쓰기용 sha를, 없으면 null을 돌려준다. */
  function existingSha(path) {
    return api(
      '/repos/' + REPO + '/contents/' + encodeURI(path) + '?ref=' + encodeURIComponent(BRANCH)
    ).then(function (res) {
      return res.ok && res.data.sha ? res.data.sha : null;
    });
  }

  function putFile(path, base64, message, sha) {
    var body = { message: message, content: base64, branch: BRANCH };
    if (sha) body.sha = sha;
    return api('/repos/' + REPO + '/contents/' + encodeURI(path), {
      method: 'PUT',
      body: body
    });
  }

  /* ── 결과 표시 ───────────────────────────────────────────────────────── */

  function showResult(html, kind) {
    el.result.innerHTML = html;
    el.result.className = 'cw-result' + (kind ? ' ' + kind : '');
    el.result.hidden = false;
  }

  /* ── 발행 ────────────────────────────────────────────────────────────── */

  function publish() {
    var problems = [];
    if (!token()) problems.push('GitHub 토큰');
    if (!el.title.value.trim()) problems.push('제목');
    if (!el.slug.value.trim()) problems.push('슬러그');
    if (!el.body.value.trim()) problems.push('본문');

    if (problems.length) {
      showResult('다음 항목이 비어 있습니다: <strong>' + problems.join(', ') + '</strong>', 'bad');
      return;
    }

    var d = parseDateInput();
    if (d.getTime() > Date.now() + 60000) {
      if (
        !confirm(
          '작성 일시가 미래로 설정돼 있습니다.\nJekyll이 미래 글을 건너뛰므로 사이트에 보이지 않습니다.\n그래도 발행할까요?'
        )
      ) {
        return;
      }
    }

    var path = postPath();
    var markdown = buildMarkdown();
    var message = el.message.value.trim() || 'post: ' + el.title.value.trim();

    el.publish.disabled = true;
    showResult('발행 중…');

    existingSha(path)
      .then(function (sha) {
        if (sha && !confirm(path + ' 가 이미 있습니다. 덮어쓸까요?')) {
          throw new Error('cancelled');
        }
        return putFile(path, textToBase64(markdown), message, sha);
      })
      .then(function (res) {
        if (!res.ok) {
          var msg = res.data && res.data.message ? res.data.message : '알 수 없는 오류';
          showResult(
            '발행 실패 (' +
              res.status +
              '): ' +
              msg +
              '<br>토큰 권한(Contents: Read and write)과 만료일을 확인해보세요.',
            'bad'
          );
          return;
        }

        var commitUrl = res.data.commit && res.data.commit.html_url;
        var postUrl = '/posts/' + el.slug.value.trim() + '/';
        showResult(
          '커밋 완료: <code>' +
            path +
            '</code><br>' +
            (commitUrl ? '<a href="' + commitUrl + '" target="_blank" rel="noopener">커밋 보기</a> · ' : '') +
            '<a href="https://github.com/' +
            REPO +
            '/actions" target="_blank" rel="noopener">빌드 상태</a> · ' +
            '<a href="' +
            postUrl +
            '">글 링크</a> (빌드 끝난 뒤 열립니다)<br>' +
            '빌드에 보통 1~2분 걸립니다.',
          'ok'
        );
        store(DRAFT_KEY, null);
        el.draftStatus.textContent = '발행 완료. 초안을 비웠습니다.';
      })
      .catch(function (err) {
        if (err && err.message === 'cancelled') {
          showResult('취소했습니다.');
        } else {
          showResult('네트워크 오류: ' + (err && err.message ? err.message : err), 'bad');
        }
      })
      .then(function () {
        el.publish.disabled = false;
      });
  }

  /* ── 이미지 업로드 ───────────────────────────────────────────────────── */

  function uploadImage(file) {
    if (!token()) {
      showResult('이미지를 올리려면 먼저 토큰을 입력하세요.', 'bad');
      return;
    }

    var safeName =
      datePrefix(new Date()) +
      '-' +
      (file.name || 'image')
        .toLowerCase()
        .replace(/[^a-z0-9.\-]/g, '-')
        .replace(/-+/g, '-');
    var path = IMG_DIR + '/' + safeName;
    var marker = '\n![업로드 중… ' + safeName + ']()\n';

    insertAtCursor(marker);
    showResult('이미지 업로드 중: ' + safeName);

    file
      .arrayBuffer()
      .then(function (buf) {
        return putFile(path, bytesToBase64(new Uint8Array(buf)), 'assets: add ' + safeName, null);
      })
      .then(function (res) {
        if (!res.ok) {
          var msg = res.data && res.data.message ? res.data.message : '오류';
          el.body.value = el.body.value.replace(marker, '\n');
          showResult('이미지 업로드 실패 (' + res.status + '): ' + msg, 'bad');
          return;
        }
        var md = '\n![' + safeName + '](/' + path + ')\n_캡션_\n';
        el.body.value = el.body.value.replace(marker, md);
        saveDraft();
        renderPreview();
        showResult('이미지 업로드 완료: <code>/' + path + '</code>', 'ok');
      })
      .catch(function (err) {
        el.body.value = el.body.value.replace(marker, '\n');
        showResult('이미지 업로드 오류: ' + err, 'bad');
      });
  }

  /* ── 에디터 편의 기능 ────────────────────────────────────────────────── */

  function insertAtCursor(text) {
    var ta = el.body;
    var start = ta.selectionStart;
    var end = ta.selectionEnd;
    ta.value = ta.value.slice(0, start) + text + ta.value.slice(end);
    ta.selectionStart = ta.selectionEnd = start + text.length;
    ta.focus();
  }

  function applyToolbar(btn) {
    var ta = el.body;
    var start = ta.selectionStart;
    var end = ta.selectionEnd;
    var selected = ta.value.slice(start, end);
    var placeholder = btn.dataset.placeholder || '';
    var text = selected || placeholder;

    if (btn.dataset.insert) {
      insertAtCursor(btn.dataset.insert.replace(/\\n/g, '\n'));
    } else if (btn.dataset.wrap) {
      var w = btn.dataset.wrap;
      ta.value = ta.value.slice(0, start) + w + text + w + ta.value.slice(end);
      ta.selectionStart = start + w.length;
      ta.selectionEnd = start + w.length + text.length;
      ta.focus();
    } else if (btn.dataset.prefix) {
      var p = btn.dataset.prefix;
      var prefixed = text
        .split('\n')
        .map(function (line) {
          return p + line;
        })
        .join('\n');
      ta.value = ta.value.slice(0, start) + prefixed + ta.value.slice(end);
      ta.selectionStart = start;
      ta.selectionEnd = start + prefixed.length;
      ta.focus();
    }
    saveDraft();
    renderPreview();
  }

  function renderPreview() {
    if (el.preview.hidden) return;
    if (typeof marked === 'undefined') {
      el.preview.textContent = '미리보기 라이브러리를 불러오지 못했습니다.';
      return;
    }
    el.preview.innerHTML = marked.parse(el.body.value || '');
  }

  /* ── 초안 자동 저장 ──────────────────────────────────────────────────── */

  var FIELDS = ['title', 'slug', 'desc', 'date', 'cat', 'tags', 'body', 'message'];
  var FLAGS = ['pin', 'math', 'mermaid', 'comments'];
  var saveTimer = null;

  function saveDraft() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(function () {
      var draft = {};
      FIELDS.forEach(function (k) {
        draft[k] = el[k].value;
      });
      FLAGS.forEach(function (k) {
        draft[k] = el[k].checked;
      });
      store(DRAFT_KEY, JSON.stringify(draft));
      el.draftStatus.textContent = '초안 저장됨 · ' + new Date().toLocaleTimeString('ko-KR');
    }, 400);
  }

  function loadDraft() {
    var raw = read(DRAFT_KEY);
    if (!raw) return false;
    try {
      var draft = JSON.parse(raw);
      FIELDS.forEach(function (k) {
        if (typeof draft[k] === 'string') el[k].value = draft[k];
      });
      FLAGS.forEach(function (k) {
        if (typeof draft[k] === 'boolean') el[k].checked = draft[k];
      });
      return true;
    } catch (e) {
      return false;
    }
  }

  /* ── 초기화 ──────────────────────────────────────────────────────────── */

  function updateFilenamePreview() {
    var slug = el.slug.value.trim();
    el.filenamePreview.innerHTML = slug
      ? '파일: <code>' + postPath() + '</code>'
      : '파일: <code>' + POSTS_DIR + '/…</code>';
  }

  var slugEditedByHand = false;

  el.title.addEventListener('input', function () {
    if (!slugEditedByHand) {
      el.slug.value = slugify(el.title.value);
      updateFilenamePreview();
    }
    saveDraft();
  });

  el.slug.addEventListener('input', function () {
    slugEditedByHand = el.slug.value.trim() !== '';
    updateFilenamePreview();
    saveDraft();
  });

  el.date.addEventListener('change', function () {
    updateFilenamePreview();
    saveDraft();
  });

  el.body.addEventListener('input', function () {
    saveDraft();
    renderPreview();
  });

  ['desc', 'cat', 'tags', 'message'].forEach(function (k) {
    el[k].addEventListener('input', saveDraft);
  });
  FLAGS.forEach(function (k) {
    el[k].addEventListener('change', saveDraft);
  });

  root.querySelectorAll('.cw-toolbar [data-wrap], .cw-toolbar [data-prefix], .cw-toolbar [data-insert]').forEach(
    function (btn) {
      btn.addEventListener('click', function () {
        applyToolbar(btn);
      });
    }
  );

  el.previewToggle.addEventListener('click', function () {
    el.preview.hidden = !el.preview.hidden;
    el.previewToggle.textContent = el.preview.hidden ? '미리보기' : '미리보기 닫기';
    renderPreview();
  });

  el.tokenCheck.addEventListener('click', checkToken);
  el.token.addEventListener('keydown', function (e) {
    if (e.key === 'Enter') checkToken();
  });

  el.tokenRemember.addEventListener('change', function () {
    if (el.tokenRemember.checked && token()) store(TOKEN_KEY, token());
    else store(TOKEN_KEY, null);
  });

  el.tokenClear.addEventListener('click', function () {
    store(TOKEN_KEY, null);
    el.token.value = '';
    el.tokenRemember.checked = false;
    setAuthStatus('저장된 토큰을 삭제했습니다');
  });

  el.imgBtn.addEventListener('click', function () {
    el.imgInput.click();
  });

  el.imgInput.addEventListener('change', function () {
    Array.prototype.forEach.call(el.imgInput.files, uploadImage);
    el.imgInput.value = '';
  });

  el.body.addEventListener('paste', function (e) {
    var items = e.clipboardData && e.clipboardData.files;
    if (!items || !items.length) return;
    var images = Array.prototype.filter.call(items, function (f) {
      return f.type.indexOf('image/') === 0;
    });
    if (!images.length) return;
    e.preventDefault();
    images.forEach(uploadImage);
  });

  ['dragenter', 'dragover'].forEach(function (evt) {
    el.body.addEventListener(evt, function (e) {
      e.preventDefault();
      el.body.classList.add('cw-dragover');
    });
  });

  ['dragleave', 'drop'].forEach(function (evt) {
    el.body.addEventListener(evt, function () {
      el.body.classList.remove('cw-dragover');
    });
  });

  el.body.addEventListener('drop', function (e) {
    if (!e.dataTransfer || !e.dataTransfer.files.length) return;
    e.preventDefault();
    Array.prototype.filter
      .call(e.dataTransfer.files, function (f) {
        return f.type.indexOf('image/') === 0;
      })
      .forEach(uploadImage);
  });

  el.publish.addEventListener('click', publish);

  el.draftClear.addEventListener('click', function () {
    if (!confirm('작성 중인 내용을 모두 지울까요?')) return;
    FIELDS.forEach(function (k) {
      el[k].value = '';
    });
    el.pin.checked = false;
    el.math.checked = false;
    el.mermaid.checked = false;
    el.comments.checked = true;
    el.date.value = localInputValue(new Date());
    slugEditedByHand = false;
    store(DRAFT_KEY, null);
    updateFilenamePreview();
    renderPreview();
    el.draftStatus.textContent = '초안을 비웠습니다.';
    el.result.hidden = true;
  });

  window.addEventListener('beforeunload', function (e) {
    if (el.body.value.trim() || el.title.value.trim()) {
      e.preventDefault();
      e.returnValue = '';
    }
  });

  /* 초기 상태 */
  var saved = read(TOKEN_KEY);
  if (saved) {
    el.token.value = saved;
    el.tokenRemember.checked = true;
    setAuthStatus('저장된 토큰 있음 · 확인을 눌러주세요');
  } else {
    el.tokenRemember.checked = false;
  }

  var restored = loadDraft();
  if (!el.date.value) el.date.value = localInputValue(new Date());
  if (restored) {
    slugEditedByHand = el.slug.value.trim() !== '';
    el.draftStatus.textContent = '이전에 작성 중이던 초안을 불러왔습니다.';
  }
  updateFilenamePreview();
})();
