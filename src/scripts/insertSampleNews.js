import mongoose from 'mongoose';
import News from '../models/News.js';
import dotenv from 'dotenv';

dotenv.config();

const sampleNewsData = [
  {
    title: '한국 K-pop 산업, 글로벌 음악 시장에서 지속적인 성장세 보여',
    subtitle: 'BTS와 블랙핑크의 세계적 성공으로 한국 음악 산업의 수출액 크게 증가',
    content: `한국의 K-pop 산업이 전 세계 음악 시장에서 눈부신 성장을 지속하고 있다. 문화체육관광부가 발표한 자료에 따르면, 올해 상반기 K-pop 관련 음악 수출액이 전년 동기 대비 25% 증가한 것으로 나타났다.

특히 BTS와 블랙핑크, 뉴진스, 아이브 등의 그룹들이 빌보드 차트와 영국 오피셜 차트에서 연이어 좋은 성과를 거두면서 한류의 영향력이 더욱 확대되고 있다. 이들의 성공은 단순히 음악에 그치지 않고 패션, 뷰티, 언어 학습 등 다양한 분야로 확산되고 있어 한국의 소프트파워 강화에 크게 기여하고 있다.

업계 전문가들은 "K-pop의 성공 비결은 체계적인 연습생 시스템과 글로벌 팬들과의 소통을 중시하는 기업 문화에 있다"며 "앞으로도 이러한 성장세가 지속될 것으로 전망된다"고 분석했다.`,
    source: 'KBS',
    originalUrl: 'https://news.kbs.co.kr/news/pc/view/view.do?ncd=7000001',
    author: 'KBS 문화부',
    category: 'entertainment',
    difficulty: 'intermediate',
    readingTime: 6,
    imageUrl: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=800&h=400&fit=crop',
    vocabularyWords: [
      { word: '성장세', meaning: 'growth trend', pronunciation: 'seong-jang-se', difficulty: 'intermediate' },
      { word: '수출액', meaning: 'export value', pronunciation: 'su-chul-aek', difficulty: 'intermediate' },
      { word: '영향력', meaning: 'influence', pronunciation: 'yeong-hyang-ryeok', difficulty: 'advanced' }
    ],
    keywords: ['K-pop', 'BTS', '블랙핑크', '한류', '음악', '글로벌', '성장'],
    tags: ['entertainment', 'KBS', 'intermediate', 'music'],
    publishedDate: new Date(Date.now() - 2 * 60 * 60 * 1000) // 2 hours ago
  },
  {
    title: '서울시, 지하철 운행 시간 1시간 연장 추진',
    subtitle: '시민 편의성 향상을 위한 심야 대중교통 서비스 확대 계획',
    content: `서울시가 지하철 운행 시간을 기존보다 1시간 연장하는 방안을 적극 검토하고 있다고 17일 발표했다. 이는 야간 근무자와 늦은 시간 귀가하는 시민들의 편의를 위한 조치로, 내년 상반기부터 시범 운행에 들어갈 예정이다.

현재 서울지하철 1~9호선의 막차 시간은 평일 기준 오후 11시 30분에서 자정 사이지만, 새로운 계획에 따르면 금요일과 토요일에는 오전 1시까지 연장 운행된다. 시는 이를 위해 약 250억 원의 예산을 투입할 계획이라고 밝혔다.

서울시 관계자는 "코로나19 이후 달라진 시민들의 생활 패턴을 반영한 것"이라며 "특히 젊은 세대와 서비스업 종사자들의 교통비 부담을 줄이고 안전한 귀가길을 제공하겠다"고 말했다.

시범 운행 기간 동안 이용객 수요와 운영 효율성을 분석한 후, 정식 도입 여부를 결정할 예정이다.`,
    source: '연합뉴스',
    originalUrl: 'https://www.yna.co.kr/view/AKR20231117001',
    author: '연합뉴스 서울시정팀',
    category: 'society',
    difficulty: 'beginner',
    readingTime: 4,
    imageUrl: 'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?w=800&h=400&fit=crop',
    vocabularyWords: [
      { word: '연장', meaning: 'extension', pronunciation: 'yeon-jang', difficulty: 'beginner' },
      { word: '편의', meaning: 'convenience', pronunciation: 'pyeon-ui', difficulty: 'beginner' },
      { word: '시범', meaning: 'trial, pilot', pronunciation: 'si-beom', difficulty: 'intermediate' }
    ],
    keywords: ['지하철', '서울시', '교통', '시민', '편의', '연장', '대중교통'],
    tags: ['society', '연합뉴스', 'beginner', 'transportation'],
    publishedDate: new Date(Date.now() - 5 * 60 * 60 * 1000) // 5 hours ago
  },
  {
    title: '한국 반도체 기업들, AI 칩 시장 진출 가속화',
    subtitle: '삼성전자와 SK하이닉스, 차세대 AI 반도체 개발에 대규모 투자',
    content: `국내 주요 반도체 기업들이 인공지능(AI) 칩 시장 진출에 박차를 가하고 있다. 삼성전자는 최근 AI 전용 메모리 반도체 개발에 향후 3년간 15조 원을 투자하겠다고 발표했으며, SK하이닉스도 HBM(고대역폭메모리) 생산 능력 확대를 위해 대규모 투자 계획을 공개했다.

이러한 움직임은 글로벌 AI 붐에 따른 고성능 반도체 수요 급증에 대응하기 위한 것이다. 특히 ChatGPT로 대표되는 생성형 AI 서비스의 확산으로 데이터센터용 고성능 메모리와 프로세서에 대한 수요가 폭증하고 있다.

업계에 따르면, AI 반도체 시장은 2025년까지 연평균 25% 이상 성장할 것으로 예상되며, 이 중 메모리 반도체가 차지하는 비중은 약 40%에 달할 전망이다.

반도체 산업 전문가는 "한국 기업들이 메모리 반도체 분야에서 쌓아온 기술력과 생산 능력을 바탕으로 AI 시대의 주도권을 잡을 수 있는 기회"라고 평가했다.`,
    source: '중앙일보',
    originalUrl: 'https://joongang.co.kr/article/25000001',
    author: '중앙일보 경제부',
    category: 'technology',
    difficulty: 'advanced',
    readingTime: 8,
    imageUrl: 'https://images.unsplash.com/photo-1518709268805-4e9042af2176?w=800&h=400&fit=crop',
    vocabularyWords: [
      { word: '반도체', meaning: 'semiconductor', pronunciation: 'ban-do-che', difficulty: 'intermediate' },
      { word: '진출', meaning: 'advance into', pronunciation: 'jin-chul', difficulty: 'intermediate' },
      { word: '투자', meaning: 'investment', pronunciation: 'tu-ja', difficulty: 'beginner' },
      { word: '확대', meaning: 'expansion', pronunciation: 'hwak-dae', difficulty: 'intermediate' }
    ],
    keywords: ['반도체', 'AI', '삼성전자', 'SK하이닉스', '투자', '기술', '시장'],
    tags: ['technology', '중앙일보', 'advanced', 'semiconductor'],
    publishedDate: new Date(Date.now() - 8 * 60 * 60 * 1000) // 8 hours ago
  },
  {
    title: '김치의 세계화, 프랑스 미슐랭 레스토랑에서도 인기',
    subtitle: '한국 전통 발효식품 김치가 서구 고급 요리계에서 새로운 트렌드로 부상',
    content: `한국의 대표적인 전통 발효식품인 김치가 유럽의 고급 레스토랑가에서 새로운 요리 트렌드로 자리 잡고 있다. 프랑스 파리의 미슐랭 2스타 레스토랑 '라틀리에'의 셰프 피에르 가니에르는 최근 김치를 활용한 퓨전 요리를 선보여 현지 미식가들로부터 큰 호평을 받았다.

김치의 독특한 발효 맛과 건강한 효능이 서구인들에게 어필하면서, 유럽과 미국의 고급 레스토랑에서 김치를 메인 재료로 한 창작 요리들이 속속 등장하고 있다. 특히 비건(완전채식주의) 트렌드와 발효식품에 대한 관심 증가가 김치 인기에 큰 역할을 하고 있다.

농수산식품유통공사에 따르면, 올해 김치 수출액은 전년 대비 18% 증가한 2억 3천만 달러를 기록할 것으로 전망된다. 수출 대상국도 일본, 중국 등 전통적인 아시아 시장에서 미국, 유럽으로 확대되고 있다.

한식재단 관계자는 "김치의 글로벌화는 단순한 식품 수출을 넘어 한국 문화 전반의 위상을 높이는 효과가 있다"며 "앞으로도 다양한 마케팅 지원을 통해 김치의 세계화를 적극 추진하겠다"고 밝혔다.`,
    source: '동아일보',
    originalUrl: 'https://www.donga.com/news/article/all/20231117/122000001',
    author: '동아일보 문화부',
    category: 'food',
    difficulty: 'intermediate',
    readingTime: 7,
    imageUrl: 'https://images.unsplash.com/photo-1553702446-a39d6fbee6b4?w=800&h=400&fit=crop',
    vocabularyWords: [
      { word: '세계화', meaning: 'globalization', pronunciation: 'se-gye-hwa', difficulty: 'advanced' },
      { word: '발효', meaning: 'fermentation', pronunciation: 'bal-hyo', difficulty: 'intermediate' },
      { word: '트렌드', meaning: 'trend', pronunciation: 'teu-ren-deu', difficulty: 'beginner' },
      { word: '효능', meaning: 'efficacy', pronunciation: 'hyo-neung', difficulty: 'intermediate' }
    ],
    keywords: ['김치', '미슐랭', '발효', '한식', '수출', '세계화', '프랑스'],
    tags: ['food', '동아일보', 'intermediate', 'culture'],
    publishedDate: new Date(Date.now() - 12 * 60 * 60 * 1000) // 12 hours ago
  },
  {
    title: '손흥민, 토트넘에서 200골 달성하며 아시아 선수 최고 기록',
    subtitle: '프리미어리그에서 활약하는 한국 축구의 자랑, 새로운 이정표 세워',
    content: `토트넘 홋스퍼의 손흥민이 클럽 통산 200호 골을 달성하며 아시아 선수로는 최고 기록을 세웠다. 지난 16일(현지시간) 에버튼과의 프리미어리그 경기에서 결승골을 넣은 손흥민은 토트넘에서의 200번째 골을 기록했다.

2015년 토트넘에 입단한 손흥민은 8년여 만에 이 기록을 달성했으며, 이는 토트넘 역사상 아시아 선수로서는 물론 현역 선수 중에서도 최고 기록이다. 특히 그는 프리미어리그에서만 150골을 넣어 아시아 선수 최다 득점 기록도 보유하고 있다.

토트넘의 안토니오 콘테 감독은 경기 후 기자회견에서 "손흥민은 단순히 골을 넣는 선수가 아니라 팀 전체의 플레이를 향상시키는 특별한 능력을 가지고 있다"며 "200골 달성을 진심으로 축하한다"고 말했다.

손흥민의 활약은 한국 축구의 위상을 높이는 것은 물론, 아시아 축구 전체의 발전에도 큰 의미가 있다는 평가를 받고 있다. 현재 그는 2026년 월드컵을 목표로 태극전사의 주장으로서 팀을 이끌고 있다.`,
    source: 'SBS',
    originalUrl: 'https://news.sbs.co.kr/news/endPage.do?news_id=N1007000001',
    author: 'SBS 스포츠팀',
    category: 'sports',
    difficulty: 'beginner',
    readingTime: 5,
    imageUrl: 'https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=800&h=400&fit=crop',
    vocabularyWords: [
      { word: '달성', meaning: 'achievement', pronunciation: 'dal-seong', difficulty: 'intermediate' },
      { word: '기록', meaning: 'record', pronunciation: 'gi-rok', difficulty: 'beginner' },
      { word: '이정표', meaning: 'milestone', pronunciation: 'i-jeong-pyo', difficulty: 'advanced' },
      { word: '활약', meaning: 'active performance', pronunciation: 'hwal-yak', difficulty: 'intermediate' }
    ],
    keywords: ['손흥민', '토트넘', '축구', '프리미어리그', '아시아', '기록', '골'],
    tags: ['sports', 'SBS', 'beginner', 'football'],
    publishedDate: new Date(Date.now() - 18 * 60 * 60 * 1000) // 18 hours ago
  }
];

const insertSampleNews = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Clear existing test data
    await News.deleteMany({ 
      originalUrl: { $regex: /news\.(kbs\.co\.kr|yna\.co\.kr|donga\.com|sbs\.co\.kr)|joongang\.co\.kr/ }
    });

    // Insert sample data
    for (const newsData of sampleNewsData) {
      const news = new News({ 
        ...newsData, 
        isApproved: true,
        status: 'active'
      });
      await news.save();
      console.log(`✅ Created: ${news.title}`);
    }

    console.log(`\n🎉 Successfully inserted ${sampleNewsData.length} sample news articles!`);
    
    // Show stats
    const stats = await News.aggregate([
      { $match: { status: 'active', isApproved: true } },
      { $group: { _id: '$category', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);

    console.log('\n📊 News by category:');
    stats.forEach(stat => {
      console.log(`- ${stat._id}: ${stat.count} articles`);
    });

  } catch (error) {
    console.error('❌ Error inserting sample news:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\n👋 Database connection closed.');
  }
};

insertSampleNews();