import React, { forwardRef, useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import HTMLFlipBook from 'react-pageflip';
import { ArrowLeft, ArrowRight, Book, Bookmark, Flower2, Minus, Plus, Trash2, Type, X } from 'lucide-react';
import { chapters, dedication } from './chapters';
import './hardcover.css';

const readingSizes = [17, 19, 21];
const chapterNumerals = ['I', 'II', 'III'];
const chapterNames = ['ONE', 'TWO', 'THREE'];
const bookmarkKey = 'pum-bookmark-v1';

function readBookmark() {
  try {
    const saved = JSON.parse(localStorage.getItem(bookmarkKey));
    if (saved?.version !== 1 || typeof saved.pageId !== 'string' || !saved.pageId) return null;
    if (saved.blockId !== null && typeof saved.blockId !== 'string') return null;
    if (!Number.isSafeInteger(saved.wordStart) || saved.wordStart < 0) return null;
    return { version: 1, pageId: saved.pageId, blockId: saved.blockId, wordStart: saved.wordStart };
  } catch {
    return null;
  }
}

function findBookmarkPage(pages, saved) {
  if (!saved) return -1;
  if (saved.blockId) {
    const passage = pages.findIndex(page => page.items?.some(item => item.blockId === saved.blockId && item.wordStart <= saved.wordStart && item.wordStart + Math.max(1, item.wordCount) > saved.wordStart));
    if (passage >= 0) return passage;
  }
  return pages.findIndex(page => page.id === saved.pageId);
}

function paginateBook(fits) {
  const pages = [{ id: 'front-cover', kind: 'front-cover' }];

  function addProse(id, title, paragraphs, salutation, signoff) {
    let items = [];
    let greeting = salutation;
    let leafNumber = 0;
    const flush = () => {
      if (!items.length) return;
      pages.push({ id: `${id}-${leafNumber++}`, kind: 'prose', chapterId: id.split('-')[0], title, items, salutation: greeting });
      items = [];
      greeting = null;
    };
    paragraphs.forEach((text, paragraphIndex) => {
      const words = text.split(/\s+/);
      let wordStart = 0;
      while (wordStart < words.length) {
        const remaining = words.slice(wordStart);
        const item = { text: remaining.join(' '), blockId: `${id}-paragraph-${paragraphIndex}`, wordStart, wordCount: remaining.length, continued: wordStart > 0 };
        if (fits([...items, item], greeting)) { items.push(item); break; }
        let low = 0;
        let high = remaining.length;
        while (low < high) {
          const middle = Math.ceil((low + high) / 2);
          if (fits([...items, { ...item, text: remaining.slice(0, middle).join(' ') }], greeting)) low = middle;
          else high = middle - 1;
        }
        if (low === 0 && items.length) { flush(); continue; }
        const count = Math.max(1, low);
        items.push({ ...item, text: remaining.slice(0, count).join(' '), wordCount: count });
        wordStart += count;
        flush();
      }
    });
    if (signoff) {
      const signature = { text: signoff, blockId: `${id}-signature`, wordStart: 0, wordCount: 0, signature: true };
      if (!fits([...items, signature], greeting)) flush();
      items.push(signature);
    }
    flush();
  }

  addProse('dedication', 'A little book of you', dedication, 'Hey BB,', 'I love you. Always and forever.');
  pages.push({ id: 'contents', kind: 'contents', title: 'Contents' });
  chapters.forEach((chapter, index) => {
    pages.push({ id: chapter.id, kind: 'chapter', chapterId: chapter.id, title: chapter.title, chapter, chapterNumber: index + 1 });
    addProse(`${chapter.id}-first`, chapter.title, chapter.paragraphs, chapter.salutation, chapter.signoff);
  });
  pages.push({ id: 'last-letter', kind: 'last-letter', title: 'With love, always' });
  if (pages.length % 2 !== 1) pages.push({ id: 'endpaper', kind: 'endpaper', title: 'With love, always' });
  pages.push({ id: 'back-cover', kind: 'back-cover' });
  return pages;
}

function Cover({ back = false }) {
  return <div className={`cloth-cover ${back ? 'back-cover' : ''}`}><div className="cover-rule" /><span className="cover-edition">A PRIVATE EDITION</span>{back ? <><span className="back-monogram">p.</span><span className="back-inscription">There is always another page.</span></> : <><div className="cover-heading"><span className="cover-kicker">A LITTLE BOOK OF YOU</span><h1>Aastha</h1><span className="cover-for">for my Pum</span></div><div className="cover-flower" aria-hidden="true"><Flower2 size={54} strokeWidth={.8} /><span /></div><p className="cover-line">Some people are a chapter.<br />You are my favorite story.</p></>}<span className="cover-author">WITH LOVE, ALWAYS</span></div>;
}

const Leaf = forwardRef(function Leaf({ page, number, pages, onNavigate }, ref) {
  const hard = page.kind.endsWith('cover');
  return <div ref={ref} className={`book-leaf ${hard ? 'hard-leaf' : 'paper-leaf'} theme-${page.chapterId || 'dedication'}`} data-density={hard ? 'hard' : 'soft'} data-page-id={page.id} data-leaf-number={number}>
    {hard ? <Cover back={page.kind === 'back-cover'} /> : <>
      <div className="running-head"><span>{page.title}</span><span>AASTHA<span className="running-name"> / PUM</span></span></div>
      <div className={`leaf-body ${page.kind === 'prose' ? 'leaf-prose' : ''}`}>
        {page.kind === 'prose' && <>{page.salutation && <p className="page-salutation">{page.salutation}</p>}{page.items.map(item => <p key={`${item.blockId}-${item.wordStart}`} className={item.signature ? 'page-signature' : `page-paragraph ${item.continued ? 'continued' : ''}`} data-block-id={item.blockId} data-word-start={item.wordStart} data-word-count={item.wordCount}>{item.text}</p>)}</>}
        {page.kind === 'contents' && <div className="printed-contents"><span className="small-print">BETWEEN THESE PAGES</span><h2>Contents</h2><div>{chapters.map((chapter, index) => <button key={chapter.id} onClick={() => onNavigate(pages.findIndex(leaf => leaf.id === chapter.id))}><span className="contents-numeral">{chapterNumerals[index]}</span><span>{chapter.title}</span><span className="contents-dots" /><span className="contents-folio">{pages.findIndex(leaf => leaf.id === chapter.id)}</span></button>)}</div><p className="contents-inscription">Three chapters.<br />One very favorite person.</p></div>}
        {page.kind === 'chapter' && <div className="chapter-frontispiece"><span className="small-print">CHAPTER {chapterNames[page.chapterNumber - 1]}</span><h2>{page.title}</h2><p className="chapter-subtitle">{page.chapter.subtitle}</p><div className="chapter-flower" aria-hidden="true"><Flower2 size={44} strokeWidth={.8} /><span /></div>{page.chapter.epigraph && <blockquote className="chapter-epigraph">{page.chapter.epigraph}</blockquote>}</div>}
        {page.kind === 'last-letter' && <div className="last-letter"><span className="small-print">AND ON YOUR BIRTHDAY</span><h2>My Pum,</h2><p>Of all the stories,<br />I am glad it is ours.</p><p>Happy birthday.</p><span>All my love.<br />Always.</span><Flower2 size={28} strokeWidth={.8} /></div>}
        {page.kind === 'endpaper' && <div className="endpaper-mark">p.</div>}
      </div>
      <span className="page-folio">{number}</span>
    </>}
  </div>;
});

function App() {
  const [model, setModel] = useState(null);
  const [pageIndex, setPageIndex] = useState(0);
  const [dialog, setDialog] = useState(null);
  const [textSize, setTextSize] = useState(1);
  const [turning, setTurning] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [savedBookmark, setSavedBookmark] = useState(readBookmark);
  const [bookmarkNotice, setBookmarkNotice] = useState(null);
  const stage = useRef(null);
  const measure = useRef(null);
  const book = useRef(null);
  const modal = useRef(null);
  const modelRef = useRef(null);
  const currentPage = useRef(0);
  const fontsReady = useRef(false);
  modelRef.current = model;

  useEffect(() => {
    const synchronize = event => {
      if (event.key === bookmarkKey || event.key === null) {
        setSavedBookmark(readBookmark());
        setBookmarkNotice(null);
      }
    };
    window.addEventListener('storage', synchronize);
    return () => window.removeEventListener('storage', synchronize);
  }, []);

  useEffect(() => {
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReducedMotion(preference.matches);
    update();
    preference.addEventListener('change', update);
    return () => preference.removeEventListener('change', update);
  }, []);

  useEffect(() => {
    let cancelled = false;
    let frame;
    function rebuild() {
      if (cancelled || !fontsReady.current || !stage.current || !measure.current) return;
      const area = stage.current.getBoundingClientRect();
      const spread = area.width >= 900;
      const width = Math.floor(Math.min(spread ? (area.width - 100) / 2 : area.width - 36, 430, (area.height - 30) / 1.6));
      const height = Math.floor(width * 1.6);
      const signature = `${width}-${height}-${textSize}-${spread}`;
      if (signature === modelRef.current?.signature) return;
      const fontSize = readingSizes[textSize];
      Object.assign(measure.current.style, { width: `${width - 56}px`, fontSize: `${fontSize}px` });
      const fits = (items, salutation) => {
        const blocks = [];
        if (salutation) {
          const greeting = document.createElement('p');
          greeting.className = 'page-salutation'; greeting.textContent = salutation; blocks.push(greeting);
        }
        items.forEach(item => {
          const paragraph = document.createElement('p');
          paragraph.className = item.signature ? 'page-signature' : 'page-paragraph';
          paragraph.textContent = item.text; blocks.push(paragraph);
        });
        measure.current.replaceChildren(...blocks);
        return measure.current.getBoundingClientRect().height <= height - 108;
      };
      const pages = paginateBook(fits);
      const oldPage = modelRef.current?.pages[currentPage.current];
      let startPage = oldPage ? pages.findIndex(page => page.id === oldPage.id) : 0;
      if (oldPage?.kind === 'prose') {
        const anchor = oldPage.items[0];
        startPage = pages.findIndex(page => page.items?.some(item => item.blockId === anchor.blockId && item.wordStart <= anchor.wordStart && item.wordStart + Math.max(1, item.wordCount) > anchor.wordStart));
      }
      startPage = Math.max(0, startPage);
      currentPage.current = startPage;
      setPageIndex(startPage);
      setTurning(false);
      setModel({ pages, width, height, spread, startPage, fontSize, signature });
    }
    const resize = () => { cancelAnimationFrame(frame); frame = requestAnimationFrame(rebuild); };
    Promise.all([document.fonts.load('500 19px "Dancing Script"'), document.fonts.load('26px Caveat'), document.fonts.load('400 48px "Luxurious Roman"')]).then(() => document.fonts.ready).then(() => { fontsReady.current = true; rebuild(); });
    const observer = new ResizeObserver(resize);
    observer.observe(stage.current);
    return () => { cancelled = true; cancelAnimationFrame(frame); observer.disconnect(); };
  }, [textSize]);

  function navigate(index) {
    if (!book.current) return;
    const target = Math.max(0, Math.min(model.pages.length - 1, index));
    book.current.pageFlip()?.turnToPage(target);
    setDialog(null);
  }

  function turn(direction) {
    const engine = book.current?.pageFlip();
    if (!engine || turning) return;
    if (reducedMotion) direction > 0 ? engine.turnToNextPage() : engine.turnToPrevPage();
    else direction > 0 ? engine.flipNext('bottom') : engine.flipPrev('bottom');
  }

  function saveBookmark() {
    const page = modelRef.current?.pages[currentPage.current];
    if (!page || page.kind.endsWith('cover')) return;
    const anchor = page.items?.[0];
    const next = { version: 1, pageId: page.id, blockId: anchor?.blockId ?? null, wordStart: anchor?.wordStart ?? 0 };
    try {
      localStorage.setItem(bookmarkKey, JSON.stringify(next));
      setSavedBookmark(next);
      setDialog(null);
    } catch {
      setBookmarkNotice({ error: true, text: "This browser couldn't save your bookmark. Please allow local storage and try again." });
    }
  }

  function removeBookmark() {
    try {
      localStorage.removeItem(bookmarkKey);
      setSavedBookmark(null);
      setDialog(null);
    } catch {
      setBookmarkNotice({ error: true, text: "This browser couldn't remove your bookmark. Please try again." });
    }
  }

  useEffect(() => {
    let frame;
    const synchronize = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
      const spread = book.current?.pageFlip()?.getOrientation() === 'landscape';
      stage.current?.querySelectorAll('[data-leaf-number]').forEach(leaf => {
        const index = Number(leaf.dataset.leafNumber);
        const visible = index === pageIndex || (spread && pageIndex !== 0 && index === pageIndex + 1);
        leaf.setAttribute('aria-hidden', String(!visible));
        leaf.inert = !visible;
      });
      });
    };
    const observer = new MutationObserver(synchronize);
    observer.observe(stage.current, { childList: true, subtree: true });
    synchronize();
    return () => { cancelAnimationFrame(frame); observer.disconnect(); };
  }, [pageIndex, model]);

  useEffect(() => {
    const handleKey = event => {
      if (dialog || event.target.closest('button, input, textarea')) return;
      if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') { event.preventDefault(); turn(event.key === 'ArrowRight' ? 1 : -1); }
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  });

  useEffect(() => {
    if (!dialog) return;
    const previousFocus = document.activeElement;
    modal.current?.focus();
    const handleKey = event => {
      if (event.key === 'Escape') setDialog(null);
      if (event.key !== 'Tab') return;
      const buttons = [...modal.current.querySelectorAll('button:not(:disabled)')];
      const first = buttons[0];
      const last = buttons[buttons.length - 1];
      if (event.shiftKey && (document.activeElement === first || document.activeElement === modal.current)) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('keydown', handleKey);
      const target = previousFocus?.getAttribute('aria-hidden') === 'true' ? document.querySelector('.footer-index') : previousFocus;
      target?.focus({ preventScroll: true });
    };
  }, [dialog]);

  const current = model?.pages[pageIndex];
  const lastPage = model ? model.pages.length - 1 : 0;
  const isCover = current?.kind.endsWith('cover');
  const savedPageIndex = model ? findBookmarkPage(model.pages, savedBookmark) : -1;
  const savedPage = model?.pages[savedPageIndex];
  const atBookmark = savedPageIndex >= 0 && (savedPageIndex === pageIndex || (model.spread && !isCover && savedPageIndex === pageIndex + 1));
  const bookmarkExcerpt = savedPage?.items?.find(item => item.blockId === savedBookmark?.blockId)?.text || savedPage?.chapter?.subtitle;

  return <div className="reading-room">
    <header className="room-header"><button className="wordmark" onClick={() => navigate(0)} aria-label="Close the book">p.</button><span>A PRIVATE EDITION <span className="header-dash" /> FOR PUM</span><button className="icon-button" onClick={() => setDialog('settings')} aria-label="Reading preferences" title="Reading preferences"><Type size={20} strokeWidth={1.4} /></button></header>
    <main className="book-stage" ref={stage} aria-label="A little book for Aastha">
      {model ? <div className={`book-holder ${model.spread ? 'spread-book' : 'single-book'} ${pageIndex === 0 ? 'front-closed' : pageIndex === lastPage ? 'back-closed' : ''}`} style={{ width: model.width * (model.spread ? 2 : 1), height: model.height, '--page-font': `${model.fontSize}px`, '--leaf-width': `${model.width}px` }}><HTMLFlipBook key={model.signature} ref={book} width={model.width} height={model.height} size="fixed" startPage={model.startPage} showCover usePortrait autoSize drawShadow maxShadowOpacity={.23} flippingTime={reducedMotion ? 1 : 750} mobileScrollSupport swipeDistance={35} clickEventForward useMouseEvents disableFlipByClick showPageCorners={!reducedMotion} renderOnlyPageLengthChange onInit={event => { currentPage.current = event.data.page; setPageIndex(event.data.page); }} onFlip={event => { currentPage.current = event.data; setPageIndex(event.data); }} onChangeState={event => setTurning(event.data === 'flipping')}>
        {model.pages.map((page, index) => <Leaf key={page.id} page={page} pages={model.pages} number={index} onNavigate={navigate} />)}
      </HTMLFlipBook><button className={`ribbon-bookmark ${isCover && !savedBookmark ? 'ribbon-hidden' : ''}`} onClick={() => { setBookmarkNotice(null); setDialog('bookmark'); }} aria-label="Bookmark options" aria-hidden={isCover && !savedBookmark} tabIndex={isCover && !savedBookmark ? -1 : 0} title={atBookmark ? 'This page is bookmarked' : 'Bookmark options'}><Bookmark size={13} strokeWidth={1.2} fill={atBookmark ? 'currentColor' : 'none'} /></button></div> : <div className="loading-cover" aria-busy="true"><Cover /></div>}
    </main>
    <footer className="room-footer"><div className="page-controls"><button className="icon-button" onClick={() => turn(-1)} disabled={!model || pageIndex === 0 || turning} aria-label="Previous page" title="Previous page"><ArrowLeft size={20} strokeWidth={1.4} /></button><span className="page-position" aria-live="polite">{!model || pageIndex === 0 ? 'The cover' : pageIndex === lastPage ? 'The back cover' : `${pageIndex} / ${lastPage - 1}`}</span><button className="icon-button" onClick={() => turn(1)} disabled={!model || pageIndex >= lastPage || turning} aria-label={pageIndex === 0 ? 'Open the book' : 'Next page'} title={pageIndex === 0 ? 'Open the book' : 'Next page'}><ArrowRight size={20} strokeWidth={1.4} /></button></div><div className="footer-meta"><button className="footer-index" onClick={() => setDialog('contents')} aria-label="Open contents"><Book size={12} strokeWidth={1.3} /><span>{isCover ? 'A LITTLE BOOK OF YOU' : current?.title || 'A LITTLE BOOK OF YOU'}</span></button><span>WITH LOVE, ALWAYS</span></div></footer>
    <div className="pagination-measure leaf-prose" ref={measure} aria-hidden="true" />
    {dialog && <div className="modal-backdrop" onClick={event => event.target === event.currentTarget && setDialog(null)}>
      <section className="book-dialog" role="dialog" aria-modal="true" aria-labelledby="dialog-title" tabIndex={-1} ref={modal}>
        <button className="icon-button dialog-close" onClick={() => setDialog(null)} aria-label="Close dialog"><X size={20} /></button>
        <span className="small-print">A LITTLE BOOK FOR PUM</span>
        <h2 id="dialog-title">{dialog === 'contents' ? 'Contents' : dialog === 'bookmark' ? 'Your bookmark' : 'Reading preferences'}</h2>
        {dialog === 'contents' ? <>
          <div className="dialog-contents">{chapters.map((chapter, index) => <button key={chapter.id} onClick={() => navigate(model?.pages.findIndex(page => page.id === chapter.id) || 0)}><span>{chapterNumerals[index]}</span><span>{chapter.title}</span><span>{model?.pages.findIndex(page => page.id === chapter.id)}</span></button>)}</div>
          <button className="back-to-cover" onClick={() => navigate(0)}>Back to the cover <ArrowLeft size={15} /></button>
        </> : dialog === 'bookmark' ? <>
          {savedPage ? <div className="bookmark-summary">
            <p className="bookmark-location"><Bookmark size={18} strokeWidth={1.3} /><span>{savedPage.title}<small>Page {savedPageIndex}</small></span></p>
            {bookmarkExcerpt && <p className="bookmark-excerpt">{bookmarkExcerpt}</p>}
          </div> : <p className="bookmark-empty">{savedBookmark ? 'This bookmarked passage is no longer in the book.' : 'No bookmark yet.'}</p>}
          <div className="bookmark-actions">
            <button onClick={() => navigate(savedPageIndex)} disabled={!savedPage || turning}><ArrowRight size={17} />Go to bookmark</button>
            <button onClick={saveBookmark} disabled={!model || isCover || turning}><Bookmark size={17} />{savedBookmark ? 'Move bookmark here' : 'Bookmark this page'}</button>
            {savedBookmark && <button className="remove-bookmark" onClick={removeBookmark}><Trash2 size={16} />Remove bookmark</button>}
          </div>
          {bookmarkNotice && <p className={`bookmark-notice ${bookmarkNotice.error ? 'bookmark-error' : ''}`} role={bookmarkNotice.error ? 'alert' : 'status'}>{bookmarkNotice.text}</p>}
        </> : <>
          <div className="font-control"><span>Text size</span><div><button className="icon-button" onClick={() => setTextSize(size => size - 1)} disabled={textSize === 0} aria-label="Decrease text size"><Minus size={18} /></button><output aria-live="polite">{['Small', 'Comfortable', 'Large'][textSize]}</output><button className="icon-button" onClick={() => setTextSize(size => size + 1)} disabled={textSize === 2} aria-label="Increase text size"><Plus size={18} /></button></div></div>
          <p className="font-preview" style={{ fontSize: readingSizes[textSize] }}>Some people are a chapter.<br />You are my favorite story.</p>
          <button className="return-to-book" onClick={() => setDialog(null)}>Return to my book <ArrowRight size={16} /></button>
        </>}
      </section>
    </div>}
  </div>;
}

createRoot(document.getElementById('root')).render(<App />);