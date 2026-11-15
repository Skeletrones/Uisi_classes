import { CalendarCheck2, FileSpreadsheet, ShieldCheck, Sparkles, Users } from 'lucide-react';
import { Logo } from './Logo';

interface OnboardingProps {
  onImport: () => void;
}

export function Onboarding({ onImport }: OnboardingProps) {
  return (
    <div className="onboarding">
      <div className="onboarding__glow" aria-hidden="true" />

      <header className="onboarding__brand">
        <Logo size={44} />
        <div>
          <strong>Пары</strong>
          <span>расписание УрТИСИ</span>
        </div>
      </header>

      <div className="onboarding__hero">
        <span className="eyebrow">
          <Sparkles size={14} />
          XLSX → нормальный интерфейс
        </span>
        <h1>
          Расписание,
          <br />
          которое не бесит
        </h1>
        <p>
          Загрузите таблицу с парами — приложение само разберёт недели, подгруппы, преподавателей
          и аудитории. Никаких горизонтальных простыней на телефоне.
        </p>
      </div>

      <div className="hero-preview" aria-hidden="true">
        <div className="hero-preview__top">
          <span>10:15 – 11:45</span>
          <span className="hero-preview__pair">2 пара</span>
        </div>
        <strong>Языки программирования</strong>
        <div className="hero-preview__tags">
          <span className="type-chip type-chip--lab">
            <span className="hero-preview__dot" />
            Лабораторная
          </span>
          <span className="subgroup-chip">1 п/гр</span>
        </div>
        <div className="hero-preview__meta">
          <span>Кириленко А.А.</span>
          <span>304 · УК №1</span>
        </div>
      </div>

      <div className="onboarding__features">
        <div>
          <FileSpreadsheet size={19} />
          <span>
            <strong>Один файл</strong>
            <small>.xlsx читается на устройстве</small>
          </span>
        </div>
        <div>
          <Users size={19} />
          <span>
            <strong>Своя подгруппа</strong>
            <small>1 п/гр или 2 п/гр в один тап</small>
          </span>
        </div>
        <div>
          <CalendarCheck2 size={19} />
          <span>
            <strong>Окна и праздники</strong>
            <small>окна видны, начало дня — нет</small>
          </span>
        </div>
      </div>

      <div className="onboarding__actions">
        <button className="button button--primary button--large" onClick={onImport}>
          <FileSpreadsheet size={19} />
          Загрузить .xlsx
        </button>
      </div>

      <p className="onboarding__privacy">
        <ShieldCheck size={15} />
        Файл не отправляется на сервер. Расписание хранится только в этом браузере.
      </p>
    </div>
  );
}
