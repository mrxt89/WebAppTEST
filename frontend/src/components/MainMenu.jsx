import React, { forwardRef } from 'react';
import { useNavigate } from 'react-router-dom';

const MainMenu = forwardRef(({ menuItems, onNavigate }, ref) => {
  const navigate = useNavigate();

  const renderMenu = (items) => {
    if (!items || !Array.isArray(items)) {
      return null;
    }

    return (
      <div className="flex flex-wrap items-center gap-4 w-full max-w-6xl mx-auto px-4">
        {items.map((item) => (
          <div
            key={item.pageId}
            onClick={() => onNavigate(item)}
            className="w-full sm:w-[calc(50%-1rem)] md:w-[220px] aspect-square p-3 primaryButton text-white text-center rounded-lg shadow-md hover:opacity-90 transition-all duration-200 flex items-center justify-center cursor-pointer transform hover:scale-[0.98]"
          >
            <span className="text-base sm:text-lg leading-relaxed fw-medium">
              {item.pageName}
            </span>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div
      ref={ref}
      className="w-full pt-20 pb-8 px-4"
    >
      {renderMenu(menuItems)}
    </div>
  );
});

export default MainMenu;