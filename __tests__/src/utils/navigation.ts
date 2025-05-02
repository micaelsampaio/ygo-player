import { useNavigate } from 'react-router-dom';

/**
 * Navigate to the detail view of a card
 * @param cardId The ID of the card to view
 * @param navigate React Router's navigate function
 */
export const navigateToCardDetail = (cardId: number | string, navigate: any) => {
  navigate(`/card/${cardId}`);
};

/**
 * React hook for card navigation
 * Returns a function that can be used to navigate to a card detail page
 */
export const useCardNavigation = () => {
  const navigate = useNavigate();
  
  return (cardId: number | string) => {
    navigateToCardDetail(cardId, navigate);
  };
};