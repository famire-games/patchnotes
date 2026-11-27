// 사이트 언어: 기본 영어. ?lang= → 저장된 선택 → 브라우저 언어 순. window.T(키, 값...) / GN(한국어 게임 이름) / TX(패치 항목)
(function () {
  const LANGS = { en: 'English', ko: '한국어', ja: '日本語', zh: '简体中文', pt: 'Português' };
  const LOCALE = { en: 'en-US', ko: 'ko-KR', ja: 'ja-JP', zh: 'zh-CN', pt: 'pt-BR' };
  const qs = new URLSearchParams(location.search).get('lang');
  let L = LANGS[qs] ? qs : null;
  if (L) try { localStorage.setItem('lang', L); } catch (e) {}
  if (!L) try { L = localStorage.getItem('lang'); } catch (e) {}
  if (!LANGS[L]) { const b = (navigator.language || 'en').slice(0, 2).toLowerCase(); L = LANGS[b] ? b : 'en'; }
  document.documentElement.lang = L;

  const D = {
    en: {
      edit: 'Edit', edit_done: 'Save', report: 'Report', reported: 'Reported', ban: 'Ban', banned_done: 'Account banned and review deleted.', banned_msg: 'This account has been suspended.', nick_taken: 'That nickname is already taken.', admin_page: 'Admin', 
      all_rev: n => 'All reviews (' + n + ')', my_rev: 'My reviews only', no_mine: 'You have not left a review yet. Tap "All reviews" to read others.', admin_del: 'Delete (admin)', 
      info_t: g => g + ' info', info_wip: 'The info page for this game is coming soon.', back_patch: 'Back to patch notes', game: 'Game', 
      set_nick: 'Set nickname', country_auto: 'Detected automatically from your connection.', 
      profile: 'Nickname & country', nick: 'Nickname', nick_ph: '2–20 characters', country: 'Country', save: 'Save', saved: 'Saved.', save_fail: 'Could not save.', nick_len: 'Nickname must be 2–20 characters.', nick_need: 'Set a nickname in the menu first.', by_country: 'By country', 
      title: 'Patchwork — Game Patch Notes, Summarized', desc: 'Summaries of the latest patch notes for popular games: buffs, nerfs and bug fixes at a glance.',
      brand: '<b>Patch</b>work', menu: 'Menu', search_ph: 'Search games or changes (e.g. Crypto, bug)', date_t: 'Find by date',
      fav: 'Favorites', fav_t: 'Show only favorite games', info_btn: 'Game info', all_games: 'All games', favlist: '★ Favorites', favlist_t: 'Show patches of favorite games only',
      ad: 'Ad', footer_note: 'Each summary is an AI summary of official Steam announcements and publisher patch notes. Check the original for exact details. Game images belong to their publishers.',
      login: 'Log in', logout: 'Log out', user: 'User', hi: n => n + ' · ', login_for_fav: 'Log in to use favorites.', fav_need_login: 'Favorites require <b>logging in</b>.',
      fav_hint: 'Add games with [☆ Favorite game] in a patch window.', buffs: '▲ Buffs', nerfs: '▼ Nerfs', none: 'None', fixes: n => `Bug fixes (${n})`, source: 'Source: ',
      all_patches: g => `All ${g} patches →`, fav_on: '★ Favorite game', fav_off: '☆ Favorite game', fav_game_t: 'Add this game to favorites',
      patches_of: g => g + ' patches', fav_chip: '★ Favorite games', search: q => 'Search: ' + q, clear: 'Clear', clear_all: 'Clear all', count: n => n + (n === 1 ? ' patch' : ' patches'),
      no_results: 'No results.', just: 'just now', m_ago: n => n + 'm ago', h_ago: n => n + 'h ago', d_ago: n => n + 'd ago',
      cm_loading: 'Loading ratings and comments…', cm_fail: 'Could not load ratings and comments.', cm_q: 'How was this patch?', rated: n => n + (n === 1 ? ' rating' : ' ratings'),
      my_star_t: 'Your rating', login_star_t: 'Log in to rate', my_star: n => 'Your rating: ' + n, comments: n => 'Comments ' + n,
      cm_ph: 'Share your thoughts on this patch', cm_ph_login: 'Log in to comment', post: 'Post', newest: 'Newest', best: 'Top', del: 'Delete', first_cm: 'Be the first to comment.',
      err_star: 'Could not save your rating.', err_post: 'Could not post. Links and contact info are not allowed.', err_del: 'Could not delete.', err_vote: 'Could not save your vote.',
      updated: 'Last updated ', login_loading: 'Login is still loading. Please try again in a moment.', login_fail: 'Login failed: ', nav_all: 'All patch notes', nav_patch: 'Patch notes', lang: 'Language',
      foot: ['About', 'Privacy policy', 'Contact / removal requests', 'Patch summaries are AI summaries of each publisher\'s official announcements and may contain mistakes. Check the original link for exact details.',
        'This is an unofficial fan site, not affiliated with or endorsed by any game company. Game names, images and data belong to their respective owners.',
        'Hearthstone data: Blizzard Entertainment (Battle.net API) · Steam data: Powered by', 'Pokémon data: PokeAPI.']
    },
    ko: {
      edit: '수정', edit_done: '수정 완료', report: '신고', reported: '신고됨', ban: '계정 정지', banned_done: '계정을 정지하고 평가를 지웠습니다.', banned_msg: '정지된 계정입니다.', nick_taken: '이미 쓰고 있는 닉네임입니다.', admin_page: '관리자', 
      all_rev: n => '모든 평가 보기 (' + n + ')', my_rev: '내 평가만 보기', no_mine: '아직 남긴 평가가 없습니다. 다른 사람 평가는 [모든 평가 보기]를 누르세요.', admin_del: '삭제(관리자)', 
      info_t: g => g + ' 정보', info_wip: '이 게임의 정보 페이지는 준비 중입니다.', back_patch: '패치노트로 돌아가기', game: '게임', 
      set_nick: '닉네임 정하기', country_auto: '접속 위치로 자동으로 정해집니다.', 
      profile: '닉네임·국가', nick: '닉네임', nick_ph: '2~20자', country: '국가', save: '저장', saved: '저장했습니다.', save_fail: '저장하지 못했습니다.', nick_len: '닉네임은 2~20자로 정해 주세요.', nick_need: '메뉴에서 닉네임을 먼저 정해 주세요.', by_country: '국가별', 
      title: 'Patchwork — 게임 패치노트 요약', desc: '인기 게임 패치노트를 요약하고 상향·하향·버그 수정을 한눈에 정리합니다.',
      brand: '<b>Patch</b>work', menu: '메뉴', search_ph: '게임 이름이나 내용 검색 (예: 크립토, 버그)', date_t: '날짜 찾기',
      fav: '즐겨찾기', fav_t: '즐겨찾기한 게임만 보기', info_btn: '게임 정보 보기', all_games: '모든 게임', favlist: '★ 즐겨찾기 목록', favlist_t: '즐겨찾기한 게임 패치만 보기',
      ad: '광고', footer_note: '각 요약은 공식 스팀 공지·게임사 공식 패치노트를 AI 로 요약한 것입니다. 정확한 내용은 원문을 확인하세요. 게임 이미지는 각 게임사의 자산입니다.',
      login: '로그인', logout: '로그아웃', user: '사용자', hi: n => n + ' 님 · ', login_for_fav: '로그인하면 즐겨찾기를 쓸 수 있습니다.', fav_need_login: '즐겨찾기는 <b>로그인</b> 후 쓸 수 있습니다.',
      fav_hint: '패치 창의 [☆ 게임 즐겨찾기] 로 추가하세요.', buffs: '▲ 상향', nerfs: '▼ 하향', none: '없음', fixes: n => `버그 수정 ${n}건`, source: '원문: ',
      all_patches: g => `${g} 모든 패치 보기 →`, fav_on: '★ 즐겨찾는 게임', fav_off: '☆ 게임 즐겨찾기', fav_game_t: '이 게임을 즐겨찾기',
      patches_of: g => g + ' 패치', fav_chip: '★ 즐겨찾기한 게임', search: q => '검색: ' + q, clear: '풀기', clear_all: '모두 풀기', count: n => n + '건',
      no_results: '결과가 없습니다.', just: '방금', m_ago: n => n + '분 전', h_ago: n => n + '시간 전', d_ago: n => n + '일 전',
      cm_loading: '평점·댓글 불러오는 중…', cm_fail: '평점·댓글을 불러오지 못했습니다.', cm_q: '이 패치 어땠나요?', rated: n => n + '명 평가',
      my_star_t: '내 별점', login_star_t: '로그인하면 별점을 줄 수 있습니다', my_star: n => '내 별점 ' + n + '점', comments: n => '댓글 ' + n,
      cm_ph: '이 패치에 대한 생각을 남겨 주세요', cm_ph_login: '로그인하면 댓글을 쓸 수 있습니다', post: '등록', newest: '최신순', best: '추천순', del: '삭제', first_cm: '첫 댓글을 남겨 보세요.',
      err_star: '별점을 저장하지 못했습니다.', err_post: '등록하지 못했습니다. 링크·연락처는 쓸 수 없습니다.', err_del: '삭제하지 못했습니다.', err_vote: '투표를 저장하지 못했습니다.',
      updated: '마지막 갱신 ', login_loading: '로그인 모듈을 불러오는 중입니다. 잠시 후 다시 눌러 주세요.', login_fail: '로그인 실패: ', nav_all: '패치노트 전체 보기', nav_patch: '패치노트', lang: '언어',
      foot: ['사이트 소개', '개인정보처리방침', '문의·삭제 요청', '패치노트 요약은 각 게임사의 공식 공지를 AI 로 요약한 것으로, 틀릴 수 있습니다. 정확한 내용은 원문 링크를 확인하세요.',
        '이 사이트는 비공식 팬 사이트이며 어떤 게임사와도 제휴하거나 보증받지 않았습니다. 게임 이름·이미지·데이터의 권리는 각 권리자에게 있습니다.',
        '하스스톤 데이터 출처: Blizzard Entertainment (Battle.net API) · 스팀 데이터: Powered by', '포켓몬 데이터: PokeAPI.']
    },
    ja: {
      edit: '編集', edit_done: '保存', report: '通報', reported: '通報済み', ban: 'アカウント停止', banned_done: 'アカウントを停止し、評価を削除しました。', banned_msg: 'このアカウントは停止されています。', nick_taken: 'そのニックネームはすでに使われています。', admin_page: '管理', 
      all_rev: n => 'すべての評価を見る (' + n + ')', my_rev: '自分の評価だけ見る', no_mine: 'まだ評価を書いていません。他の人の評価は［すべての評価を見る］から。', admin_del: '削除（管理者）', 
      info_t: g => g + ' の情報', info_wip: 'このゲームの情報ページは準備中です。', back_patch: 'パッチノートに戻る', game: 'ゲーム', 
      set_nick: 'ニックネーム設定', country_auto: '接続元から自動で判定されます。', 
      profile: 'ニックネーム・国', nick: 'ニックネーム', nick_ph: '2〜20文字', country: '国', save: '保存', saved: '保存しました。', save_fail: '保存できませんでした。', nick_len: 'ニックネームは2〜20文字にしてください。', nick_need: '先にメニューでニックネームを設定してください。', by_country: '国別', 
      title: 'Patchwork — ゲームパッチノート要約', desc: '人気ゲームのパッチノートを要約し、強化・弱体化・バグ修正をひと目で整理します。',
      brand: '<b>Patch</b>work', menu: 'メニュー', search_ph: 'ゲーム名や内容で検索（例：クリプト、バグ）', date_t: '日付で探す',
      fav: 'お気に入り', fav_t: 'お気に入りのゲームだけ表示', info_btn: 'ゲーム情報', all_games: 'すべてのゲーム', favlist: '★ お気に入り', favlist_t: 'お気に入りゲームのパッチだけ表示',
      ad: '広告', footer_note: '各要約は Steam 公式告知・各社公式パッチノートを AI で要約したものです。正確な内容は原文をご確認ください。ゲーム画像は各社に帰属します。',
      login: 'ログイン', logout: 'ログアウト', user: 'ユーザー', hi: n => n + ' さん · ', login_for_fav: 'ログインするとお気に入りが使えます。', fav_need_login: 'お気に入りは<b>ログイン</b>後に使えます。',
      fav_hint: 'パッチ画面の［☆ お気に入り］で追加できます。', buffs: '▲ 強化', nerfs: '▼ 弱体化', none: 'なし', fixes: n => `バグ修正 ${n}件`, source: '原文：',
      all_patches: g => `${g} のパッチをすべて見る →`, fav_on: '★ お気に入り中', fav_off: '☆ お気に入り', fav_game_t: 'このゲームをお気に入りに追加',
      patches_of: g => g + ' のパッチ', fav_chip: '★ お気に入りのゲーム', search: q => '検索：' + q, clear: '解除', clear_all: 'すべて解除', count: n => n + '件',
      no_results: '結果がありません。', just: 'たった今', m_ago: n => n + '分前', h_ago: n => n + '時間前', d_ago: n => n + '日前',
      cm_loading: '評価・コメントを読み込み中…', cm_fail: '評価・コメントを読み込めませんでした。', cm_q: 'このパッチはどうでしたか？', rated: n => n + '人が評価',
      my_star_t: 'あなたの評価', login_star_t: 'ログインすると評価できます', my_star: n => 'あなたの評価 ' + n, comments: n => 'コメント ' + n,
      cm_ph: 'このパッチの感想を書いてください', cm_ph_login: 'ログインするとコメントできます', post: '投稿', newest: '新着順', best: '人気順', del: '削除', first_cm: '最初のコメントを書いてみましょう。',
      err_star: '評価を保存できませんでした。', err_post: '投稿できませんでした。リンクや連絡先は書けません。', err_del: '削除できませんでした。', err_vote: '投票を保存できませんでした。',
      updated: '最終更新 ', login_loading: 'ログイン機能を読み込み中です。少し待ってからもう一度お試しください。', login_fail: 'ログイン失敗：', nav_all: 'パッチノート一覧', nav_patch: 'パッチノート', lang: '言語',
      foot: ['サイト紹介', 'プライバシーポリシー', 'お問い合わせ・削除依頼', 'パッチ要約は各社の公式告知を AI で要約したもので、誤りを含む場合があります。正確な内容は原文リンクをご確認ください。',
        '当サイトは非公式ファンサイトであり、いかなるゲーム会社とも提携・保証関係にありません。ゲーム名・画像・データの権利は各権利者に帰属します。',
        'ハースストーンのデータ：Blizzard Entertainment (Battle.net API) · Steam データ：Powered by', 'ポケモンのデータ：PokeAPI.']
    },
    zh: {
      edit: '编辑', edit_done: '保存', report: '举报', reported: '已举报', ban: '封禁账号', banned_done: '已封禁账号并删除评价。', banned_msg: '该账号已被封禁。', nick_taken: '该昵称已被使用。', admin_page: '管理', 
      all_rev: n => '查看全部评价 (' + n + ')', my_rev: '只看我的评价', no_mine: '你还没有发表评价。点击［查看全部评价］查看他人的评价。', admin_del: '删除（管理员）', 
      info_t: g => g + ' 信息', info_wip: '该游戏的信息页面正在准备中。', back_patch: '返回补丁说明', game: '游戏', 
      set_nick: '设置昵称', country_auto: '根据访问位置自动判定。', 
      profile: '昵称·国家', nick: '昵称', nick_ph: '2~20 个字符', country: '国家/地区', save: '保存', saved: '已保存。', save_fail: '保存失败。', nick_len: '昵称需为 2~20 个字符。', nick_need: '请先在菜单中设置昵称。', by_country: '按国家', 
      title: 'Patchwork — 游戏补丁说明摘要', desc: '汇总热门游戏的补丁说明，增强、削弱和错误修复一目了然。',
      brand: '<b>Patch</b>work', menu: '菜单', search_ph: '搜索游戏或内容（例如：Crypto、bug）', date_t: '按日期查找',
      fav: '收藏', fav_t: '只显示收藏的游戏', info_btn: '游戏信息', all_games: '所有游戏', favlist: '★ 收藏列表', favlist_t: '只显示收藏游戏的补丁',
      ad: '广告', footer_note: '每条摘要均由 AI 根据 Steam 官方公告及厂商官方补丁说明生成。具体内容请以原文为准。游戏图片归各厂商所有。',
      login: '登录', logout: '退出', user: '用户', hi: n => n + ' · ', login_for_fav: '登录后即可使用收藏。', fav_need_login: '收藏功能需要<b>登录</b>。',
      fav_hint: '在补丁窗口点击［☆ 收藏游戏］即可添加。', buffs: '▲ 增强', nerfs: '▼ 削弱', none: '无', fixes: n => `错误修复 ${n} 项`, source: '原文：',
      all_patches: g => `查看 ${g} 全部补丁 →`, fav_on: '★ 已收藏', fav_off: '☆ 收藏游戏', fav_game_t: '收藏这个游戏',
      patches_of: g => g + ' 补丁', fav_chip: '★ 收藏的游戏', search: q => '搜索：' + q, clear: '清除', clear_all: '全部清除', count: n => n + ' 条',
      no_results: '没有结果。', just: '刚刚', m_ago: n => n + ' 分钟前', h_ago: n => n + ' 小时前', d_ago: n => n + ' 天前',
      cm_loading: '正在加载评分和评论…', cm_fail: '无法加载评分和评论。', cm_q: '你觉得这次补丁怎么样？', rated: n => n + ' 人评分',
      my_star_t: '我的评分', login_star_t: '登录后即可评分', my_star: n => '我的评分 ' + n, comments: n => '评论 ' + n,
      cm_ph: '说说你对这次补丁的看法', cm_ph_login: '登录后即可评论', post: '发布', newest: '最新', best: '最热', del: '删除', first_cm: '来发表第一条评论吧。',
      err_star: '评分保存失败。', err_post: '发布失败。不能包含链接或联系方式。', err_del: '删除失败。', err_vote: '投票保存失败。',
      updated: '最后更新 ', login_loading: '登录模块加载中，请稍后再试。', login_fail: '登录失败：', nav_all: '查看全部补丁', nav_patch: '补丁说明', lang: '语言',
      foot: ['关于本站', '隐私政策', '联系 / 删除请求', '补丁摘要由 AI 根据各厂商官方公告生成，可能存在错误。具体内容请查看原文链接。',
        '本站为非官方粉丝网站，与任何游戏公司均无合作或背书关系。游戏名称、图片和数据的权利归各权利人所有。',
        '炉石传说数据来源：Blizzard Entertainment (Battle.net API) · Steam 数据：Powered by', '宝可梦数据：PokeAPI.']
    },
    pt: {
      edit: 'Editar', edit_done: 'Salvar', report: 'Denunciar', reported: 'Denunciado', ban: 'Banir conta', banned_done: 'Conta banida e avaliação excluída.', banned_msg: 'Esta conta está suspensa.', nick_taken: 'Esse apelido já está em uso.', admin_page: 'Admin', 
      all_rev: n => 'Ver todas as avaliações (' + n + ')', my_rev: 'Só as minhas', no_mine: 'Você ainda não avaliou. Toque em "Ver todas as avaliações" para ler as dos outros.', admin_del: 'Excluir (admin)', 
      info_t: g => 'Info de ' + g, info_wip: 'A página de informações deste jogo está em preparação.', back_patch: 'Voltar às notas de patch', game: 'Jogo', 
      set_nick: 'Definir apelido', country_auto: 'Detectado automaticamente pela sua conexão.', 
      profile: 'Apelido e país', nick: 'Apelido', nick_ph: '2–20 caracteres', country: 'País', save: 'Salvar', saved: 'Salvo.', save_fail: 'Não foi possível salvar.', nick_len: 'O apelido deve ter de 2 a 20 caracteres.', nick_need: 'Defina um apelido no menu primeiro.', by_country: 'Por país', 
      title: 'Patchwork — Notas de patch resumidas', desc: 'Resumos das notas de atualização dos jogos populares: buffs, nerfs e correções de bugs num relance.',
      brand: '<b>Patch</b>work', menu: 'Menu', search_ph: 'Buscar jogos ou mudanças (ex.: Crypto, bug)', date_t: 'Buscar por data',
      fav: 'Favoritos', fav_t: 'Mostrar só jogos favoritos', info_btn: 'Info do jogo', all_games: 'Todos os jogos', favlist: '★ Favoritos', favlist_t: 'Mostrar só patches dos favoritos',
      ad: 'Anúncio', footer_note: 'Cada resumo é um resumo por IA dos anúncios oficiais da Steam e das notas oficiais das empresas. Confira o original para detalhes exatos. As imagens pertencem às respectivas empresas.',
      login: 'Entrar', logout: 'Sair', user: 'Usuário', hi: n => n + ' · ', login_for_fav: 'Entre para usar os favoritos.', fav_need_login: 'Os favoritos exigem <b>login</b>.',
      fav_hint: 'Adicione jogos com [☆ Favoritar jogo] na janela do patch.', buffs: '▲ Buffs', nerfs: '▼ Nerfs', none: 'Nenhum', fixes: n => `Correções de bugs (${n})`, source: 'Original: ',
      all_patches: g => `Todos os patches de ${g} →`, fav_on: '★ Jogo favorito', fav_off: '☆ Favoritar jogo', fav_game_t: 'Adicionar este jogo aos favoritos',
      patches_of: g => 'Patches de ' + g, fav_chip: '★ Jogos favoritos', search: q => 'Busca: ' + q, clear: 'Limpar', clear_all: 'Limpar tudo', count: n => n + (n === 1 ? ' patch' : ' patches'),
      no_results: 'Nenhum resultado.', just: 'agora', m_ago: n => 'há ' + n + ' min', h_ago: n => 'há ' + n + ' h', d_ago: n => 'há ' + n + ' d',
      cm_loading: 'Carregando avaliações e comentários…', cm_fail: 'Não foi possível carregar avaliações e comentários.', cm_q: 'O que achou deste patch?', rated: n => n + (n === 1 ? ' avaliação' : ' avaliações'),
      my_star_t: 'Sua avaliação', login_star_t: 'Entre para avaliar', my_star: n => 'Sua nota: ' + n, comments: n => 'Comentários ' + n,
      cm_ph: 'Diga o que achou deste patch', cm_ph_login: 'Entre para comentar', post: 'Enviar', newest: 'Recentes', best: 'Mais curtidos', del: 'Excluir', first_cm: 'Seja o primeiro a comentar.',
      err_star: 'Não foi possível salvar sua nota.', err_post: 'Não foi possível enviar. Links e contatos não são permitidos.', err_del: 'Não foi possível excluir.', err_vote: 'Não foi possível salvar seu voto.',
      updated: 'Atualizado em ', login_loading: 'O login ainda está carregando. Tente de novo em instantes.', login_fail: 'Falha no login: ', nav_all: 'Todas as notas de patch', nav_patch: 'Patch notes', lang: 'Idioma',
      foot: ['Sobre', 'Política de privacidade', 'Contato / pedidos de remoção', 'Os resumos são feitos por IA a partir dos anúncios oficiais de cada empresa e podem conter erros. Confira o link original para detalhes exatos.',
        'Este é um site de fãs não oficial, sem afiliação ou endosso de nenhuma empresa de jogos. Nomes, imagens e dados dos jogos pertencem aos respectivos donos.',
        'Dados de Hearthstone: Blizzard Entertainment (Battle.net API) · Dados da Steam: Powered by', 'Dados de Pokémon: PokeAPI.']
    }
  };
  const S = D[L];
  window.LANG = L; window.LANGS = LANGS; window.LOC = LOCALE[L];
  window.T = (k, ...a) => { const v = S[k] ?? D.en[k]; return typeof v === 'function' ? v(...a) : v; };
  window.NAMES = {};
  // 국가: 국기 그림(flagcdn) + 이 언어로 된 국가 이름
  const CN = (() => { try { return new Intl.DisplayNames([LOCALE[L]], { type: 'region' }); } catch (e) { return null; } })();
  window.CNAME = c => { try { return (CN && CN.of(c)) || c; } catch (e) { return c; } };
  window.FLAG = c => /^[A-Z]{2}$/.test(c || '') ? `<img class="flag" src="https://flagcdn.com/20x15/${c.toLowerCase()}.png" width="20" height="15" alt="${c}" title="${CNAME(c)}" loading="lazy">` : '';
  window.COUNTRIES = 'AR AU AT BE BR CA CL CN CO CZ DK EG FI FR DE GR HK HU IN ID IE IL IT JP KZ KR MY MX NL NZ NO PE PH PL PT RO RU SA SG ZA ES SE CH TW TH TR UA AE GB US VN'.split(' ');
  // 게임 이름: data.json names[한국어 이름][언어] (한국어면 그대로)
  window.GN = n => L === 'ko' ? n : (window.NAMES[n]?.[L] || window.NAMES[n]?.en || n);
  // 패치 내용: 이 언어 → 영어 → 한국어(원래 필드)
  window.TX = i => L === 'ko' ? i : (i.i18n?.[L] || i.i18n?.en || i);
  window.setLang = l => { try { localStorage.setItem('lang', l); } catch (e) {} const u = new URL(location.href); u.searchParams.set('lang', l); location.href = u.toString(); };
  // 언어 고르기 (헤더 오른쪽, 로그인 버튼 앞) — 페이지가 그려진 뒤 붙임
  window.langPicker = () => {
    const s = document.createElement('select');
    s.title = T('lang'); s.className = 'langsel';
    s.style.cssText = 'background:var(--card,#171a21);border:1px solid var(--line,#262a33);color:var(--tx,#e6e8ec);border-radius:8px;padding:5px 8px;font:inherit;font-size:13px;cursor:pointer';
    for (const [k, v] of Object.entries(LANGS)) s.add(new Option(v, k, false, k === L));
    s.onchange = () => setLang(s.value);
    return s;
  };
})();
