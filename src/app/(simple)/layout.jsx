import PropTypes from 'prop-types';
// project-imports
import SimpleLayout from 'layout/SimpleLayout';

// ================================|| SIMPLE LAYOUT ||================================ //

export default function Layout({ children }) {
  return <SimpleLayout>{children}</SimpleLayout>;
}

Layout.propTypes = { children: PropTypes.node };
