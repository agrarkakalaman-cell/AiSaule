const features = [
  {
    number: "01",
    title: "Сөйлесіп үйреніңіз",
    text: "Күнделікті жағдайларға арналған қысқа диалогтармен тілді бірден қолдана бастаңыз.",
  },
  {
    number: "02",
    title: "Дауысыңызды жаттықтырыңыз",
    text: "Айтылымыңызды тыңдап, анық әрі сенімді сөйлеуге бір қадам жақындай түсіңіз.",
  },
  {
    number: "03",
    title: "Өз ырғағыңызбен жүріңіз",
    text: "Күніне 10 минут бөліңіз — шағын қадамдар үлкен нәтижеге жеткізеді.",
  },
];

export default function Home() {
  return (
    <main>
      <header className="site-header">
        <a className="brand" href="#basty-bet" aria-label="TILIN AI басты беті">
          <span className="brand-mark">т</span>
          <span>TILIN<span className="brand-dot">.</span>AI</span>
        </a>
        <nav className="main-nav" aria-label="Негізгі навигация">
          <a href="#mumkindikter">Мүмкіндіктер</a>
          <a href="#qalai">Қалай жұмыс істейді</a>
          <a href="#bastau">Бастау</a>
        </nav>
        <a className="header-cta" href="#bastau">Кіру <span aria-hidden="true">↗</span></a>
      </header>

      <section className="hero" id="basty-bet">
        <div className="hero-copy">
          <p className="eyebrow"><span /> ҚАЗАҚ ТІЛІН ҮЙРЕНУ ПЛАТФОРМАСЫ</p>
          <h1>Қазақша сөйлей<br /><em>бастайтын</em> кез келді.</h1>
          <p className="hero-text">Қарапайым сабақтар, тірі диалогтар және жеке қарқын. Қазақ тілін күнделікті өмірдің бір бөлігіне айналдырыңыз.</p>
          <div className="hero-actions" id="bastau">
            <a className="primary-cta" href="#qalai">Тегін бастау <span aria-hidden="true">→</span></a>
            <a className="text-cta" href="#mumkindikter">Толығырақ білу <span aria-hidden="true">↓</span></a>
          </div>
          <dl className="hero-stats" aria-label="Платформа көрсеткіштері">
            <div><dt>10 мин</dt><dd>күніне жеткілікті</dd></div>
            <div><dt>30+</dt><dd>өмірлік тақырып</dd></div>
            <div><dt>100%</dt><dd>қазақша орта</dd></div>
          </dl>
        </div>

        <div className="hero-art" aria-label="Қазақша сөйлесуге арналған бейнелі иллюстрация" role="img">
          <div className="sun-shape" />
          <div className="circle-grid" />
          <div className="speech speech-one">Сәлем!</div>
          <div className="speech speech-two">Қалың қалай?</div>
          <div className="person">
            <span className="hair" />
            <span className="face"><i /><b /></span>
            <span className="neck" />
            <span className="shirt" />
            <span className="collar left" /><span className="collar right" />
          </div>
          <div className="orb orb-one">ә</div>
          <div className="orb orb-two">ң</div>
          <p className="art-note">Сөз — байланыс<br />бастамасы</p>
        </div>
      </section>

      <section className="feature-section" id="mumkindikter" aria-labelledby="features-title">
        <div className="section-intro">
          <p className="eyebrow"><span /> ТІЛДІ ӨМІРДЕ ҚОЛДАНУ ҮШІН</p>
          <h2 id="features-title">Оқыңыз емес,<br /><em>сөйлесіңіз.</em></h2>
        </div>
        <div className="feature-list">
          {features.map((feature) => (
            <article className="feature-card" key={feature.number}>
              <span className="feature-number">{feature.number}</span>
              <h3>{feature.title}</h3>
              <p>{feature.text}</p>
              <span className="feature-arrow" aria-hidden="true">↗</span>
            </article>
          ))}
        </div>
      </section>

      <section className="path-section" id="qalai" aria-labelledby="path-title">
        <div>
          <p className="eyebrow light"><span /> БҮГІННЕН БАСТАУҒА БОЛАДЫ</p>
          <h2 id="path-title">Бірінші диалогыңыз<br />үш қадамда.</h2>
        </div>
        <ol className="path-list">
          <li><strong>Тақырыпты таңдаңыз</strong><span>Өзіңізге жақын жағдайдан бастаңыз.</span></li>
          <li><strong>Тыңдап, қайталаңыз</strong><span>Сөздерді естіп, дұрыс айтылымға үйреніңіз.</span></li>
          <li><strong>Диалог құрыңыз</strong><span>Жаңа сөзді бірден өз әңгімеңізде қолданыңыз.</span></li>
        </ol>
      </section>

      <footer className="site-footer">
        <a className="brand" href="#basty-bet"><span className="brand-mark">т</span><span>TILIN<span className="brand-dot">.</span>AI</span></a>
        <p>Қазақ тілінде еркін сөйлеуге арналған жылы орта.</p>
        <a href="#basty-bet">Жоғарыға ↑</a>
      </footer>
    </main>
  );
}
