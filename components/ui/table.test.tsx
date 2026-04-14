import { render, screen } from "@testing-library/react";

import {
    Table,
    TableBody,
    TableCaption,
    TableCell,
    TableFooter,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";

describe("Table", () => {
    it("renders the complete table structure", () => {
        render(
            <Table>
                <TableCaption>Summary</TableCaption>
                <TableHeader>
                    <TableRow>
                        <TableHead>Name</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    <TableRow>
                        <TableCell>Milk</TableCell>
                    </TableRow>
                </TableBody>
                <TableFooter>
                    <TableRow>
                        <TableCell>Total</TableCell>
                    </TableRow>
                </TableFooter>
            </Table>,
        );

        expect(screen.getByText("Summary")).toHaveAttribute("data-slot", "table-caption");
        expect(screen.getByText("Name")).toHaveAttribute("data-slot", "table-head");
        expect(screen.getByText("Milk")).toHaveAttribute("data-slot", "table-cell");
        expect(screen.getByText("Total")).toHaveAttribute("data-slot", "table-cell");
    });
});