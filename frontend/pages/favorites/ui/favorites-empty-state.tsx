import { Link } from 'react-router';

export function FavoritesEmptyState() {
  return (
    <div className="flex flex-col items-center justify-center gap-6 py-24 text-center">
      <span className="material-symbols-outlined text-5xl text-muted-foreground opacity-40">
        favorite_border
      </span>
      <div className="flex flex-col gap-1">
        <p className="font-headline text-xl font-bold text-foreground">
          즐겨찾기가 비어있습니다
        </p>
        <p className="text-sm text-muted-foreground">
          자주 확인하는 장소를 저장해 두세요
        </p>
      </div>
      <div className="flex flex-col gap-3 sm:flex-row">
        <Link
          to="/search"
          className="flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-bold text-primary-foreground"
        >
          <span className="material-symbols-outlined text-base">search</span>
          장소 검색하기
        </Link>
        <Link
          to="/"
          className="flex items-center gap-2 rounded-full bg-muted px-6 py-3 text-sm font-semibold text-foreground"
        >
          <span className="material-symbols-outlined text-base">
            my_location
          </span>
          현재 위치 보기
        </Link>
      </div>
    </div>
  );
}
