/* ===========================================================
   JN IA — comportamento do site

   Duas camadas, propositalmente separadas:

   1. Interface (menu, formulário, pop-up, poeira do hero).
      Não depende de biblioteca nenhuma. Funciona sozinha.
   2. Movimento (GSAP + ScrollTrigger + SplitText, servidos do
      próprio domínio porque a CSP do site só aceita script 'self').

   Se o GSAP não carregar, a raiz ganha .no-gsap e o CSS devolve
   tudo visível. Conteúdo não depende de biblioteca pra existir.
   =========================================================== */
(function () {
  'use strict';

  var raiz = document.documentElement;
  var reduzido = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var temGsap = !!(window.gsap && window.ScrollTrigger && window.SplitText);

  if (!temGsap) raiz.classList.add('no-gsap');

  /* =========================================================
     1 / INTERFACE
     ========================================================= */

  // ---------- Menu mobile ----------
  (function () {
    var toggle = document.getElementById('nav-toggle');
    var nav = document.getElementById('nav-principal');
    if (!toggle || !nav) return;

    toggle.addEventListener('click', function () {
      var aberto = nav.classList.toggle('aberto');
      toggle.setAttribute('aria-expanded', aberto ? 'true' : 'false');
    });
    nav.querySelectorAll('a').forEach(function (a) {
      a.addEventListener('click', function () {
        nav.classList.remove('aberto');
        toggle.setAttribute('aria-expanded', 'false');
      });
    });
  })();

  // ---------- Formulário: abre o WhatsApp já preenchido ----------
  (function () {
    var form = document.getElementById('form-orcamento');
    if (!form) return;

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var linhas = [
        'Olá! Quero um diagnóstico gratuito.',
        '',
        'Nome: ' + form.nome.value.trim(),
        'Telefone: ' + form.telefone.value.trim(),
        'E-mail: ' + form.email.value.trim(),
        'Preciso de: ' + form.servico.value
      ];
      if (form.mensagem.value.trim()) linhas.push('Mensagem: ' + form.mensagem.value.trim());
      window.open('https://wa.me/5514996793639?text=' + encodeURIComponent(linhas.join('\n')), '_blank', 'noopener');
    });
  })();

  // ---------- Pop-up de saída ----------
  (function () {
    var popup = document.getElementById('exit-popup');
    var fechar = document.getElementById('exit-fechar');
    if (!popup || !fechar) return;
    var jaMostrou = false;

    function abrir() {
      if (jaMostrou || sessionStorage.getItem('jnia_exit_popup')) return;
      jaMostrou = true;
      sessionStorage.setItem('jnia_exit_popup', '1');
      popup.classList.add('aberto');
      popup.setAttribute('aria-hidden', 'false');
    }
    function fecharPopup() {
      popup.classList.remove('aberto');
      popup.setAttribute('aria-hidden', 'true');
    }

    fechar.addEventListener('click', fecharPopup);
    // O CTA leva ao formulário: fecha o overlay e deixa a âncora rolar
    var cta = popup.querySelector('.btn');
    if (cta) cta.addEventListener('click', fecharPopup);
    popup.addEventListener('click', function (e) { if (e.target === popup) fecharPopup(); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') fecharPopup(); });

    document.addEventListener('mouseout', function (e) {
      if (!e.relatedTarget && e.clientY <= 0) abrir();
    });
    window.addEventListener('scroll', function () {
      var pct = (window.scrollY + window.innerHeight) / document.documentElement.scrollHeight;
      if (pct > 0.85) abrir();
    }, { passive: true });
  })();

  // ---------- Poeira metálica do hero (canvas, sem lib) ----------
  (function () {
    var canvas = document.getElementById('hero-sparks');
    if (!canvas || !canvas.getContext) return;
    var ctx = canvas.getContext('2d');
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var w = 0, h = 0, parts = [], raf = null;

    function build() {
      var host = canvas.parentElement || canvas;
      var r = host.getBoundingClientRect();
      w = r.width; h = r.height;
      if (w < 10 || h < 10) return;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      // celular ganha menos partícula: mesma leitura, menos trabalho por frame
      var densidade = w < 640 ? 22000 : 9000;
      var n = Math.max(14, Math.min(Math.round((w * h) / densidade), 90));
      parts = [];
      for (var i = 0; i < n; i++) {
        parts.push({
          x: Math.random() * w, y: Math.random() * h,
          r: Math.random() * 1.1 + 0.4,
          base: Math.random() * 0.4 + 0.12,
          amp: Math.random() * 0.4 + 0.2,
          ph: Math.random() * Math.PI * 2,
          sp: Math.random() * 0.0016 + 0.0005,
          vx: (Math.random() - 0.5) * 0.1,
          vy: -(Math.random() * 0.13 + 0.03)
        });
      }
    }

    function dot(p, o) {
      ctx.globalAlpha = o < 0 ? 0 : (o > 1 ? 1 : o);
      ctx.fillStyle = '#eef2f5';
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();
    }

    function frame(t) {
      ctx.clearRect(0, 0, w, h);
      for (var i = 0; i < parts.length; i++) {
        var p = parts[i];
        dot(p, p.base + p.amp * (0.5 + 0.5 * Math.sin(t * p.sp + p.ph)));
        p.x += p.vx; p.y += p.vy;
        if (p.y < -2) { p.y = h + 2; p.x = Math.random() * w; }
        if (p.x < -2) p.x = w + 2; else if (p.x > w + 2) p.x = -2;
      }
      ctx.globalAlpha = 1;
      raf = requestAnimationFrame(frame);
    }

    function estatico() {
      ctx.clearRect(0, 0, w, h);
      for (var i = 0; i < parts.length; i++) dot(parts[i], parts[i].base + parts[i].amp * 0.5);
      ctx.globalAlpha = 1;
    }

    function pausar() { if (raf) { cancelAnimationFrame(raf); raf = null; } }
    function retomar() { if (!raf && !reduzido && parts.length) raf = requestAnimationFrame(frame); }

    function reinit() {
      pausar();
      build();
      if (!parts.length) return;
      if (reduzido) estatico(); else retomar();
    }

    build();
    // re-inicializa quando layout e fontes assentam (hero no tamanho cheio)
    window.addEventListener('load', reinit);
    window.addEventListener('resize', reinit);

    // Sem isso o loop roda pra sempre, inclusive com o hero fora da tela.
    // Em celular isso é bateria e travamento de graça.
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (e) {
        if (e[0].isIntersecting) retomar(); else pausar();
      }, { threshold: 0 }).observe(canvas.parentElement || canvas);
    }
    document.addEventListener('visibilitychange', function () {
      if (document.hidden) pausar(); else retomar();
    });

    if (reduzido) estatico(); else raf = requestAnimationFrame(frame);
  })();

  /* =========================================================
     2 / MOVIMENTO

     Em prefers-reduced-motion o bloco inteiro não roda: o CSS já
     força tudo visível com !important, então não há o que animar.
     ========================================================= */
  if (!temGsap || reduzido) return;

  gsap.registerPlugin(ScrollTrigger, SplitText);

  var ease = 'power2.out';

  // ---------- A fonte de luz da página ----------
  // O scroll move --luz e todo elemento prata lê a mesma posição.
  // É o que faz a página inteira ler como uma chapa de metal só.
  function moverLuz(self) {
    // 16% -> 84%: a luz varre a chapa de cima a baixo ao longo da página
    raiz.style.setProperty('--luz', (16 + self.progress * 68).toFixed(2) + '%');
  }
  // onRefresh também, senão a página nasce com o valor de repouso do CSS
  // e a luz só assume a posição certa depois do primeiro scroll.
  ScrollTrigger.create({ start: 0, end: 'max', onUpdate: moverLuz, onRefresh: moverLuz });

  // ---------- Barra de progresso no header ----------
  gsap.to('#progresso', {
    scaleX: 1,
    ease: 'none',
    scrollTrigger: { start: 0, end: 'max', scrub: 0.35 }
  });

  // ---------- Hero ----------
  // O h1 entra por linha, cada uma subindo por trás da própria máscara.
  // autoSplit refaz a quebra quando a fonte carrega ou a tela muda,
  // que é exatamente quando um split feito uma vez só quebra feio.
  SplitText.create('#hero-h1', {
    type: 'lines',
    mask: 'lines',
    linesClass: 'linha',
    autoSplit: true,
    onSplit: function (self) {
      return gsap.from(self.lines, {
        yPercent: 112,
        duration: 0.9,
        ease: 'power3.out',
        stagger: 0.11
      });
    }
  });

  gsap.fromTo('[data-hero]',
    { opacity: 0, y: 16 },
    { opacity: 1, y: 0, duration: 0.7, ease: ease, stagger: 0.09, delay: 0.24 });

  // ---------- Títulos de seção ----------
  gsap.utils.toArray('h2.split').forEach(function (h2) {
    SplitText.create(h2, {
      type: 'lines',
      mask: 'lines',
      linesClass: 'linha',
      autoSplit: true,
      onSplit: function (self) {
        return gsap.from(self.lines, {
          yPercent: 112,
          duration: 0.8,
          ease: 'power3.out',
          stagger: 0.09,
          scrollTrigger: { trigger: h2, start: 'top 86%', once: true }
        });
      }
    });
  });

  // ---------- Entrada dos blocos ----------
  // batch junta o que entra na tela junto e escalona em uma leva só,
  // em vez de disparar um trigger por elemento.
  //
  // onEnterBack não é enfeite: quem abre o site num link com âncora
  // (jnia.com.br/#contato) cai direto no meio da página, e tudo que
  // ficou acima nunca chegou a entrar pela frente. Sem esse callback
  // aquele conteúdo fica invisível pra sempre quando a pessoa sobe.
  function entrada(dist, dur, escalonar) {
    return function (lote) {
      gsap.fromTo(lote,
        { opacity: 0, y: dist },
        { opacity: 1, y: 0, duration: dur, ease: ease, stagger: escalonar, overwrite: true });
    };
  }

  var revelaBloco = entrada(18, 0.62, 0.1);
  ScrollTrigger.batch('.reveal', {
    start: 'top 88%',
    once: true,
    onEnter: revelaBloco,
    onEnterBack: revelaBloco
  });

  var revelaItem = entrada(14, 0.52, 0.07);
  ScrollTrigger.batch('.reveal-group > *', {
    start: 'top 90%',
    once: true,
    onEnter: revelaItem,
    onEnterBack: revelaItem
  });

  // Fonte web mudando a altura do texto move todos os pontos de gatilho.
  document.fonts && document.fonts.ready.then(function () { ScrollTrigger.refresh(); });
})();
