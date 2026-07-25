import { Routes, Route, useLocation } from 'react-router-dom';
import { TabBar } from './components/TabBar';
import { HomeScreen } from './screens/HomeScreen';
import { StatsScreen } from './screens/StatsScreen';
import { SettingsScreen } from './screens/SettingsScreen';
import { ChapterDetailScreen } from './screens/ChapterDetailScreen';
import { QuestionListScreen } from './screens/QuestionListScreen';
import { StudyScreen } from './screens/StudyScreen';
import { ResultScreen } from './screens/ResultScreen';

const IMMERSIVE = [/^\/study/, /^\/result/, /^\/chapter\//];

export default function App() {
  const { pathname } = useLocation();
  const immersive = IMMERSIVE.some((re) => re.test(pathname));
  return (
    <div className="app">
      <Routes>
        <Route path="/" element={<HomeScreen />} />
        <Route path="/stats" element={<StatsScreen />} />
        <Route path="/settings" element={<SettingsScreen />} />
        <Route path="/chapter/:chapter" element={<ChapterDetailScreen />} />
        <Route path="/chapter/:chapter/questions" element={<QuestionListScreen />} />
        <Route path="/study/:mode/:chapter" element={<StudyScreen />} />
        <Route path="/result" element={<ResultScreen />} />
      </Routes>
      {!immersive && <TabBar />}
    </div>
  );
}
