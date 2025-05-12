import React, { useState, useEffect } from 'react';
import { 
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { CalendarIcon, ChevronLeft, ChevronRight } from 'lucide-react';
import { format, getWeek, startOfWeek, endOfWeek, getYear, getQuarter } from 'date-fns';
import { it } from 'date-fns/locale';

const AdaptiveDatePicker = ({ 
  timeBucket, 
  selectedDate, 
  setSelectedDate, 
  formattedPeriod
}) => {
  // Track current view state for year and month pickers
  const [yearView, setYearView] = useState(getYear(selectedDate));
  
  // Handle selection based on current timeBucket
  const handleSelection = (date) => {
    if (!date) return;
    
    switch(timeBucket) {
      case 'day':
        setSelectedDate(date);
        break;
      case 'week':
        // Select the beginning of the week containing the selected date
        setSelectedDate(startOfWeek(date, { weekStartsOn: 1 }));
        break;
      case 'month':
        // Set to the first day of the selected month
        const firstOfMonth = new Date(date.getFullYear(), date.getMonth(), 1);
        setSelectedDate(firstOfMonth);
        break;
      case 'quarter':
        // Calculate first day of the quarter
        const currentQuarter = getQuarter(date);
        const firstMonthOfQuarter = (currentQuarter - 1) * 3;
        const firstOfQuarter = new Date(date.getFullYear(), firstMonthOfQuarter, 1);
        setSelectedDate(firstOfQuarter);
        break;
      case 'year':
        // Set to January 1st of the selected year
        const firstOfYear = new Date(date.getFullYear(), 0, 1);
        setSelectedDate(firstOfYear);
        break;
    }
  };

  // Generate months for quarter picker
  const quartersMonths = [
    [0, 1, 2],    // Q1: Jan, Feb, Mar
    [3, 4, 5],    // Q2: Apr, May, Jun
    [6, 7, 8],    // Q3: Jul, Aug, Sep
    [9, 10, 11]   // Q4: Oct, Nov, Dec
  ];
  
  // Generate quarters display
  const renderQuarterPicker = () => {
    const year = yearView;
    
    return (
      <div className="p-3">
        <div className="flex justify-between items-center mb-4">
          <Button variant="ghost" size="sm" onClick={() => setYearView(yearView - 1)}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="font-medium">{yearView}</div>
          <Button variant="ghost" size="sm" onClick={() => setYearView(yearView + 1)}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        
        <div className="grid grid-cols-2 gap-2">
          {quartersMonths.map((months, index) => {
            const quarterNumber = index + 1;
            const quarterDate = new Date(year, months[0], 1);
            const isCurrentQuarter = getQuarter(selectedDate) === quarterNumber && 
                                     getYear(selectedDate) === year;
            
            return (
              <Button
                key={`Q${quarterNumber}`}
                variant={isCurrentQuarter ? "default" : "outline"}
                className="p-2 h-auto"
                onClick={() => handleSelection(quarterDate)}
              >
                Q{quarterNumber}
              </Button>
            );
          })}
        </div>
      </div>
    );
  };
  
  // Year picker
  const renderYearPicker = () => {
    const startYear = Math.floor(yearView / 10) * 10;
    const years = Array.from({ length: 10 }, (_, i) => startYear + i);
    
    return (
      <div className="p-3">
        <div className="flex justify-between items-center mb-4">
          <Button variant="ghost" size="sm" onClick={() => setYearView(startYear - 10)}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="font-medium">{startYear} - {startYear + 9}</div>
          <Button variant="ghost" size="sm" onClick={() => setYearView(startYear + 10)}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        
        <div className="grid grid-cols-3 gap-2">
          {years.map(year => {
            const yearDate = new Date(year, 0, 1);
            const isCurrentYear = getYear(selectedDate) === year;
            
            return (
              <Button
                key={year}
                variant={isCurrentYear ? "default" : "outline"}
                className="p-2 h-auto"
                onClick={() => handleSelection(yearDate)}
              >
                {year}
              </Button>
            );
          })}
        </div>
      </div>
    );
  };
  
  // Month picker
  const renderMonthPicker = () => {
    const monthNames = Array.from({ length: 12 }, (_, i) => 
      format(new Date(2000, i, 1), 'MMM', { locale: it })
    );
    
    return (
      <div className="p-3">
        <div className="flex justify-between items-center mb-4">
          <Button variant="ghost" size="sm" onClick={() => setYearView(yearView - 1)}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="font-medium">{yearView}</div>
          <Button variant="ghost" size="sm" onClick={() => setYearView(yearView + 1)}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        
        <div className="grid grid-cols-3 gap-2">
          {monthNames.map((month, index) => {
            const monthDate = new Date(yearView, index, 1);
            const isCurrentMonth = selectedDate.getMonth() === index && 
                                 getYear(selectedDate) === yearView;
            
            return (
              <Button
                key={month}
                variant={isCurrentMonth ? "default" : "outline"}
                className="p-2 h-auto"
                onClick={() => handleSelection(monthDate)}
              >
                {month}
              </Button>
            );
          })}
        </div>
      </div>
    );
  };
  
  // Week picker renderer
  const renderWeekPicker = () => {
    return (
      <div className="p-0">
        <Calendar
          mode="single"
          selected={selectedDate}
          onSelect={(date) => {
            if (date) {
              handleSelection(date);
            }
          }}
          initialFocus
          weekStartsOn={1} // Monday
          classNames={{
            day_selected: "bg-blue-500 text-white hover:bg-blue-500",
            day_today: "bg-blue-100 text-blue-900",
          }}
          // Highlight the entire week
          modifiers={{
            selected: (date) => {
              if (!selectedDate) return false;
              
              const startWeekDay = startOfWeek(selectedDate, { weekStartsOn: 1 });
              const endWeekDay = endOfWeek(selectedDate, { weekStartsOn: 1 });
              
              return date >= startWeekDay && date <= endWeekDay;
            }
          }}
        />
      </div>
    );
  };

  // Render the appropriate picker based on the time bucket
  const renderPickerContent = () => {
    switch(timeBucket) {
      case 'day':
        return (
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={(date) => date && handleSelection(date)}
            initialFocus
          />
        );
      case 'week':
        return renderWeekPicker();
      case 'month':
        return renderMonthPicker();
      case 'quarter':
        return renderQuarterPicker();
      case 'year':
        return renderYearPicker();
      default:
        return (
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={(date) => date && handleSelection(date)}
            initialFocus
          />
        );
    }
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" className="h-10 px-2 w-full justify-between">
          <span>{formattedPeriod}</span>
          <CalendarIcon className="h-4 w-4 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="center">
        {renderPickerContent()}
      </PopoverContent>
    </Popover>
  );
};

export default AdaptiveDatePicker;