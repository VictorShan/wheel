import { useContext } from "react";
import { ItemsContext } from "./providers";
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";
import { ColumnDef, flexRender, getCoreRowModel } from "@tanstack/react-table";
import { Item } from "./types";
import { useReactTable } from "@tanstack/react-table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import { Button } from "~/components/ui/button";
import { DotsHorizontalIcon } from "@radix-ui/react-icons";

export default function ItemTable({
  onItemSelect,
}: {
  onItemSelect: (itemId: number) => void;
}) {
  const items = useContext(ItemsContext);
  const columns: ColumnDef<Item>[] = [
    {
      header: "Item Name",
      accessorKey: "longName",
    },
    {
      id: "actions",
      cell: ({ row }) => {
        const item = row.original;
        return (
          <div className="flex w-full justify-end">
            <Button onClick={() => onItemSelect(item.id)}>View</Button>
          </div>
        );
      },
    },
  ];
  const table = useReactTable({
    columns,
    data: items ?? [],
    getCoreRowModel: getCoreRowModel(),
  });
  return (
    <Table>
      <TableHeader>
        {table.getHeaderGroups().map((headerGroup) => (
          <TableRow key={headerGroup.id}>
            {headerGroup.headers.map((header) => {
              return (
                <TableHead key={header.id}>
                  {header.isPlaceholder
                    ? null
                    : flexRender(
                        header.column.columnDef.header,
                        header.getContext(),
                      )}
                </TableHead>
              );
            })}
          </TableRow>
        ))}
      </TableHeader>
      <TableBody>
        {table.getRowModel().rows?.length ? (
          table.getRowModel().rows.map((row) => (
            <TableRow key={row.id}>
              {row.getVisibleCells().map((cell) => (
                <TableCell key={cell.id}>
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </TableCell>
              ))}
            </TableRow>
          ))
        ) : (
          <TableRow>
            <TableCell colSpan={columns.length}>No items</TableCell>
          </TableRow>
        )}
      </TableBody>
      <TableFooter>
        <TableRow>
          <TableCell className="text-center" colSpan={2}>
            Click on view to select and edit items
          </TableCell>
        </TableRow>
      </TableFooter>
    </Table>
  );
}

interface DataTableProps {
  columns: ColumnDef<Item>[];
  data: Item[];
}
