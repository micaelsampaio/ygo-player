import React, { ReactNode } from "react";
import styled, { css } from "styled-components";
import theme from "../../styles/theme";

interface TableProps {
  children: ReactNode;
  striped?: boolean;
  bordered?: boolean;
  compact?: boolean;
  responsive?: boolean;
  className?: string;
}

interface TableCellProps {
  children: ReactNode;
  align?: "left" | "center" | "right";
  width?: string;
  className?: string;
}

const StyledTable = styled.table<{
  striped?: boolean;
  bordered?: boolean;
  compact?: boolean;
}>`
  width: 100%;
  border-collapse: collapse;
  font-size: ${theme.typography.size.base};

  ${(props) =>
    props.bordered &&
    css`
      border: 1px solid ${theme.colors.border.default};

      th,
      td {
        border: 1px solid ${theme.colors.border.default};
      }
    `}

  ${(props) =>
    props.compact &&
    css`
      th,
      td {
        padding: ${theme.spacing.xs} ${theme.spacing.sm};
      }
    `}
  
  ${(props) =>
    !props.compact &&
    css`
      th,
      td {
        padding: ${theme.spacing.sm} ${theme.spacing.md};
      }
    `}
  
  th {
    text-align: left;
    font-weight: ${theme.typography.weight.semibold};
    background-color: ${theme.colors.background.card};
    color: ${theme.colors.text.primary};
    border-bottom: 2px solid ${theme.colors.border.default};
  }

  tr:last-child td {
    border-bottom: 0;
  }

  ${(props) =>
    props.striped &&
    css`
      tbody tr:nth-child(odd) {
        background-color: ${theme.colors.background.default};
      }

      tbody tr:nth-child(even) {
        background-color: ${theme.colors.background.paper};
      }
    `}

  tbody tr {
    border-bottom: 1px solid ${theme.colors.border.light};
    transition: background-color 0.2s;

    &:hover {
      background-color: ${theme.colors.background.card};
    }
  }
`;

const ResponsiveWrapper = styled.div`
  width: 100%;
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
`;

const StyledTableHead = styled.thead``;

const StyledTableBody = styled.tbody``;

const StyledTableRow = styled.tr``;

const StyledTableCell = styled.td<{ align?: string; width?: string }>`
  text-align: ${(props) => props.align || "left"};
  ${(props) => props.width && `width: ${props.width};`}
  vertical-align: middle;
`;

const StyledTableHeaderCell = styled.th<{ align?: string; width?: string }>`
  text-align: ${(props) => props.align || "left"};
  ${(props) => props.width && `width: ${props.width};`}
`;

const StyledTableFooter = styled.tfoot`
  background-color: ${theme.colors.background.card};

  td {
    border-top: 2px solid ${theme.colors.border.default};
    font-weight: ${theme.typography.weight.medium};
  }
`;

export const Table: React.FC<TableProps> = ({
  children,
  striped = false,
  bordered = false,
  compact = false,
  responsive = true,
  className,
}) => {
  const table = (
    <StyledTable
      striped={striped}
      bordered={bordered}
      compact={compact}
      className={className}
    >
      {children}
    </StyledTable>
  );

  return responsive ? <ResponsiveWrapper>{table}</ResponsiveWrapper> : table;
};

export const TableHead: React.FC<{
  children: ReactNode;
  className?: string;
}> = ({ children, className }) => (
  <StyledTableHead className={className}>{children}</StyledTableHead>
);

export const TableBody: React.FC<{
  children: ReactNode;
  className?: string;
}> = ({ children, className }) => (
  <StyledTableBody className={className}>{children}</StyledTableBody>
);

export const TableRow: React.FC<{
  children: ReactNode;
  className?: string;
}> = ({ children, className }) => (
  <StyledTableRow className={className}>{children}</StyledTableRow>
);

export const TableCell: React.FC<TableCellProps> = ({
  children,
  align = "left",
  width,
  className,
}) => (
  <StyledTableCell align={align} width={width} className={className}>
    {children}
  </StyledTableCell>
);

export const TableHeaderCell: React.FC<TableCellProps> = ({
  children,
  align = "left",
  width,
  className,
}) => (
  <StyledTableHeaderCell align={align} width={width} className={className}>
    {children}
  </StyledTableHeaderCell>
);

export const TableFooter: React.FC<{
  children: ReactNode;
  className?: string;
}> = ({ children, className }) => (
  <StyledTableFooter className={className}>{children}</StyledTableFooter>
);

// Export named components
Table.Head = TableHead;
Table.Body = TableBody;
Table.Row = TableRow;
Table.Cell = TableCell;
Table.HeaderCell = TableHeaderCell;
Table.Footer = TableFooter;
