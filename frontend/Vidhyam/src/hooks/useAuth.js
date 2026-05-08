import { useSelector } from 'react-redux';
import { selectCurrentToken, selectSchoolId, selectCurrentUser } from '../features/auth/authSlice';

export const useAuth = () => {
    const token = useSelector(selectCurrentToken);
    const schoolId = useSelector(selectSchoolId);
    const user = useSelector(selectCurrentUser);

    return {
        token,
        schoolId,
        user,
        isAuthenticated: !!token
    };
};
